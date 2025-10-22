import { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const LoadPage = () => {
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<File[]>([])

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

    return (
        <div>
            <div className='mb-3'>
                <p className='text-2xl font-semibold'>Load documents</p>
            </div>

            <div className='max-w-2xl'>
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
                                <p className="text-sm font-medium text-gray-700">
                                    Uploaded Files ({files.length})
                                </p>
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
                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            aria-label="Remove file"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
