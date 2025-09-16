import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import './ImageUpload.css'

interface ImageUploadProps {
  onImagesUploaded: (imageUrls: string[]) => void
  maxImages?: number
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesUploaded, maxImages = 10 }) => {
  const { user } = useAuth()
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated')
    if (!supabase) throw new Error('Supabase not configured')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('user-images')
      .upload(fileName, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('user-images')
      .getPublicUrl(data.path)

    // Save image record to database
    await supabase
      .from('user_images')
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        image_name: file.name
      })

    return publicUrl
  }

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return

    const remainingSlots = maxImages - uploadedImages.length
    const filesToUpload = Array.from(files).slice(0, remainingSlots)

    if (filesToUpload.length === 0) {
      alert(`You can only upload up to ${maxImages} images total.`)
      return
    }

    setUploading(true)

    try {
      const uploadPromises = filesToUpload.map(uploadImage)
      const newImageUrls = await Promise.all(uploadPromises)

      const updatedImages = [...uploadedImages, ...newImageUrls]
      setUploadedImages(updatedImages)
      onImagesUploaded(updatedImages)
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Error uploading images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeImage = async (index: number) => {
    const imageUrl = uploadedImages[index]

    try {
      // Remove from database
      if (supabase) {
        await supabase
          .from('user_images')
          .delete()
          .eq('image_url', imageUrl)
          .eq('user_id', user?.id)
      }

      // Remove from state
      const updatedImages = uploadedImages.filter((_, i) => i !== index)
      setUploadedImages(updatedImages)
      onImagesUploaded(updatedImages)
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }

  return (
    <div className="image-upload">
      <h3>Upload Your Ingredient Photos</h3>
      <p>Upload up to {maxImages} photos of your fridge, pantry, or ingredients ({uploadedImages.length}/{maxImages})</p>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="uploading">
            <div className="spinner"></div>
            <p>Uploading images...</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📸</div>
            <p>Drag & drop images here or click to select</p>
            <p className="upload-hint">Supports JPG, PNG formats</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />

      {uploadedImages.length > 0 && (
        <div className="uploaded-images">
          <h4>Uploaded Images</h4>
          <div className="image-grid">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="image-item">
                <img src={imageUrl} alt={`Uploaded ${index + 1}`} />
                <button
                  className="remove-button"
                  onClick={() => removeImage(index)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUpload