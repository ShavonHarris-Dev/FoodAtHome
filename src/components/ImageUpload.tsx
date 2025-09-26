import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import heic2any from 'heic2any'
import './ImageUpload.css'

interface ImageUploadProps {
  onImagesUploaded: (imageUrls: string[]) => void
  maxImages?: number
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesUploaded, maxImages = 10 }) => {
  const { user } = useAuth()
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing images when component mounts
  useEffect(() => {
    const loadExistingImages = async () => {
      if (!user || !supabase) return

      console.log('🔍 Loading images for user:', user.id, user.email)
      console.log('🔍 Supabase client headers:', supabase?.rest.headers)

      try {
        const { data: images, error } = await supabase
          .from('user_images')
          .select('image_url')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error loading existing images:', error)
          return
        }

        if (images && images.length > 0) {
          const imageUrls = images.map(img => img.image_url)
          setUploadedImages(imageUrls)
          onImagesUploaded(imageUrls)
        }
      } catch (error) {
        console.error('Error loading existing images:', error)
      }
    }

    loadExistingImages()
  }, [user, onImagesUploaded])

  // Check if file is HEIC format
  const isHEIC = (file: File): boolean => {
    const fileName = file.name.toLowerCase()

    // Simple and reliable HEIC detection - only check file extension
    return fileName.endsWith('.heic') || fileName.endsWith('.heif')
  }

  // Convert HEIC to JPEG
  const convertHEICToJPEG = async (file: File): Promise<File> => {
    try {
      console.log('Starting HEIC conversion for:', file.name, 'Size:', file.size, 'Type:', file.type)

      // Validate file size
      if (file.size === 0) {
        throw new Error('HEIC file appears to be empty or corrupted')
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('HEIC file is too large (max 50MB)')
      }

      const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      })

      console.log('HEIC conversion result:', result)

      // heic2any can return either a Blob or an array of Blobs
      const blob = Array.isArray(result) ? result[0] : result

      if (!blob || blob.size === 0) {
        throw new Error('Conversion resulted in empty file')
      }

      // Create a new File object from the converted blob
      const convertedFile = new File(
        [blob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      )

      console.log('HEIC conversion successful. New file:', convertedFile.name, 'Size:', convertedFile.size)
      return convertedFile
    } catch (error) {
      console.error('HEIC conversion failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed'
      console.error('Error details:', errorMessage)

      // Provide more helpful error messages
      if (errorMessage.includes('Could not parse HEIF file')) {
        throw new Error('HEIC file is corrupted or in an unsupported format. Please try taking a new photo.')
      }

      throw new Error(`HEIC conversion failed: ${errorMessage}. Try uploading a JPG or PNG instead.`)
    }
  }

  // Process file (convert HEIC if needed)
  const processFile = async (file: File): Promise<File> => {
    console.log('Processing file:', file.name, 'Type:', file.type, 'HEIC detected:', isHEIC(file))

    if (isHEIC(file)) {
      console.log('Converting HEIC file:', file.name)
      return await convertHEICToJPEG(file)
    }
    return file
  }

  const uploadImage = async (originalFile: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated')
    if (!supabase) throw new Error('Supabase not configured')

    // Process file (convert HEIC if needed)
    const processedFile = await processFile(originalFile)

    const fileExt = processedFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('user-images')
      .upload(fileName, processedFile)

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
        image_name: processedFile.name
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

    // Check if any files need conversion
    const hasHEICFiles = filesToUpload.some(file => isHEIC(file))

    if (hasHEICFiles) {
      setConverting(true)
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

      // More specific error messages
      if (error instanceof Error && error.message.includes('convert HEIC')) {
        alert('Error converting HEIC images. Please try uploading JPG or PNG files instead.')
      } else {
        alert('Error uploading images. Please try again.')
      }
    } finally {
      setUploading(false)
      setConverting(false)
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

      <div className="upload-tips">
        <h4>📸 Tips for Better Detection:</h4>
        <div className="tips-grid">
          <div className="tip-item">
            <span className="tip-icon">✅</span>
            <span>Take multiple angles: shelves, door, drawers separately</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">✅</span>
            <span>Ensure good lighting - avoid shadows</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">✅</span>
            <span>Move items to show labels clearly</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">❌</span>
            <span>Avoid blurry or dark photos</span>
          </div>
        </div>
      </div>

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
            {converting ? (
              <div>
                <p>Converting HEIC images...</p>
                <p className="upload-hint">This may take a moment</p>
              </div>
            ) : (
              <p>Uploading images...</p>
            )}
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📸</div>
            <p>Drag & drop images here or click to select</p>
            <p className="upload-hint">Supports JPG, PNG, HEIC formats</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
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