import { useState } from 'react'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { useNavigate } from '@tanstack/react-router'

export const LoadPage = () => {
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadedIds, setUploadedIds] = useState<number[]>([])
    const navigate = useNavigate()
    
    const getUploadUrlMutation = trpc.getUploadUrl.useMutation()
    const startUploadMutation = trpc.startUploadDocument.useMutation()

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFiles = Array.from(e.dataTransfer.files)
        const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf')
        
        if (pdfFiles.length > 0) {
            setFiles(prev => [...prev, ...pdfFiles])
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf')
            
            if (pdfFiles.length > 0) {
                setFiles(prev => [...prev, ...pdfFiles])
            }
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    const handleUpload = async () => {
        if (files.length === 0) return
        
        setUploading(true)
        const documentIds: number[] = []
        
        try {
            for (const file of files) {
                // Step 1: Get presigned URL using tRPC mutation
                const { url, objectName } = await getUploadUrlMutation.mutateAsync({
                    filename: file.name,
                    catalogCode: 'temp' // Temporary, will be auto-assigned after ML
                })
                
                // Step 2: Upload directly to MinIO using presigned URL
                // Note: This must use fetch as it's a direct upload to MinIO storage
                const uploadResponse = await fetch(url, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        'Content-Type': file.type
                    }
                })
                
                if (!uploadResponse.ok) {
                    throw new Error(`Upload failed for ${file.name}`)
                }
                
                // Step 3: Start processing using tRPC mutation
                const result = await startUploadMutation.mutateAsync({
                    objectName,
                    filename: file.name
                })
                
                documentIds.push(result.documentId)
            }
            
            setUploadedIds(documentIds)
            
            // Navigate to processing page after successful upload
            setTimeout(() => {
                navigate({ to: '/processing' })
            }, 1000)
            
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Upload failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div>
            <div className='mb-3'>
                <p className='text-2xl font-semibold'>Load documents</p>
            </div>

            <div className='w-full'>
                <Card>
                    <CardContent>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                                relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                                transition-colors duration-200
                                ${isDragging 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }
                            `}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                accept=".pdf,application/pdf"
                                multiple
                                onChange={handleFileInput}
                                className="hidden"
                            />
                            
                            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            
                            <p className="text-lg font-medium text-gray-700 mb-2">
                                Drop PDF files here
                            </p>
                            <p className="text-sm text-gray-500">
                                or click to browse
                            </p>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-700">
                                        Selected Files ({files.length})
                                    </p>
                                    <Button 
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <Upload className="w-4 h-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Upload & Process
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <FileText className="w-5 h-5 text-red-500" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            disabled={uploading}
                                            className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                                            aria-label="Remove file"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                ))}
                                {uploadedIds.length > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-800">
                                            Successfully uploaded {uploadedIds.length} file(s). Redirecting to processing page...
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
