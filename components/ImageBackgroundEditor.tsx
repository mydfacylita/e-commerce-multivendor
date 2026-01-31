'use client'

// Wrapper para manter compatibilidade - usa o novo componente com IA
import ImageBackgroundRemover from './ImageBackgroundRemover'

interface ImageBackgroundEditorProps {
  onImageProcessed: (imageUrl: string) => void
  onClose: () => void
  initialImage?: string
}

export default function ImageBackgroundEditor(props: ImageBackgroundEditorProps) {
  return <ImageBackgroundRemover {...props} />
}
