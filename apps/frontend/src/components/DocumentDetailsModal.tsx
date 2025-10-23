import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Document {
    id: number
    filename: string
    documentType: string | null
    confidence: number | null
    extractedData: Record<string, any> | null
    catalog: {
        name: string
    }
    createdAt: string
}

interface DocumentDetailsModalProps {
    document: Document | null
    open: boolean
    onClose: () => void
}

const formatFieldName = (field: string): string => {
    // Convert camelCase to Title Case
    return field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
}

const renderFieldValue = (value: any): string => {
    if (value === null || value === undefined) {
        return 'N/A'
    }
    if (Array.isArray(value)) {
        return value.join(', ')
    }
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
    }
    return String(value)
}

export const DocumentDetailsModal = ({ document, open, onClose }: DocumentDetailsModalProps) => {
    if (!document) return null

    const documentTypeDisplay = document.documentType
        ? document.documentType.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        : 'Unknown'

    const hasExtractedData = document.extractedData && Object.keys(document.extractedData).length > 0

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>📄 {documentTypeDisplay}</span>
                        {document.confidence && (
                            <Badge variant="secondary" className="ml-2">
                                {(document.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Basic Info */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Document Information</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Filename:</span>
                                <span className="text-sm font-medium">{document.filename}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Catalog:</span>
                                <span className="text-sm font-medium">{document.catalog.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Uploaded:</span>
                                <span className="text-sm font-medium">
                                    {new Date(document.createdAt).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Extracted Data */}
                    {hasExtractedData ? (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3">Extracted Information</h3>
                            <div className="space-y-3">
                                {Object.entries(document.extractedData!).map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-start">
                                        <span className="text-sm text-gray-600 min-w-[140px]">
                                            {formatFieldName(key)}:
                                        </span>
                                        <span className="text-sm font-medium text-right flex-1">
                                            {renderFieldValue(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500">
                                No extracted information available
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                The document may still be processing or extraction failed
                            </p>
                        </div>
                    )}

                    {/* Confidence Indicator */}
                    {document.confidence && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Classification Confidence</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-green-500 h-2 rounded-full transition-all"
                                            style={{ width: `${document.confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium">
                                        {(document.confidence * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
