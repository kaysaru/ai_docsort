import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { FileText, Clock, CheckCircle, XCircle, Loader2, FolderOpen } from 'lucide-react'
import { DocumentDetailsModal } from '@/components/DocumentDetailsModal'

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        processing: 'bg-blue-100 text-blue-800 border-blue-300',
        completed: 'bg-green-100 text-green-800 border-green-300',
        failed: 'bg-red-100 text-red-800 border-red-300',
    }

    const icons = {
        pending: <Clock className="w-3 h-3" />,
        processing: <Loader2 className="w-3 h-3 animate-spin" />,
        completed: <CheckCircle className="w-3 h-3" />,
        failed: <XCircle className="w-3 h-3" />,
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pending}`}>
            {icons[status as keyof typeof icons]}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}

const DocumentTypeDisplay = ({ type, confidence }: { type?: string; confidence?: number }) => {
    if (!type) return <span className="text-gray-400 text-sm">Detecting...</span>

    const displayType = type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{displayType}</span>
            {confidence !== undefined && (
                <span className="text-xs text-gray-500">
                    ({(confidence * 100).toFixed(0)}% confidence)
                </span>
            )}
        </div>
    )
}

export const ProcessingPage = () => {
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    
    const { data: documents, refetch } = trpc.listDocuments.useQuery({
        limit: 50
    }, {
        refetchInterval: autoRefresh ? 3000 : false, // Auto-refresh every 3 seconds
    })
    
    const { data: selectedDocument } = trpc.getDocument.useQuery(
        { documentId: selectedDocumentId! },
        { enabled: !!selectedDocumentId }
    )
    
    const handleDocumentClick = (docId: number) => {
        setSelectedDocumentId(docId)
        setModalOpen(true)
    }
    
    const handleCloseModal = () => {
        setModalOpen(false)
        setSelectedDocumentId(null)
    }

    const stats = {
        total: documents?.length || 0,
        pending: documents?.filter(d => d.status === 'pending').length || 0,
        processing: documents?.filter(d => d.status === 'processing').length || 0,
        completed: documents?.filter(d => d.status === 'completed').length || 0,
        failed: documents?.filter(d => d.status === 'failed').length || 0,
    }

    // Auto-disable refresh when no pending/processing documents
    useEffect(() => {
        if (stats.pending === 0 && stats.processing === 0) {
            setAutoRefresh(false)
        }
    }, [stats.pending, stats.processing])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Document Processing</h1>
                <button
                    onClick={() => {
                        setAutoRefresh(!autoRefresh)
                        refetch()
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                >
                    {autoRefresh ? '🔄 Auto-refreshing...' : 'Enable auto-refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-xs text-gray-500">Total</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        <div className="text-xs text-gray-500">Pending</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                        <div className="text-xs text-gray-500">Processing</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                        <div className="text-xs text-gray-500">Completed</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                        <div className="text-xs text-gray-500">Failed</div>
                    </CardContent>
                </Card>
            </div>

            {/* Documents List */}
            <Card>
                <CardHeader>
                    <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    {!documents || documents.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No documents uploaded yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => doc.status === 'completed' && handleDocumentClick(doc.id)}
                                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                                        doc.status === 'completed' 
                                            ? 'cursor-pointer hover:bg-gray-50 hover:border-blue-300' 
                                            : 'cursor-default hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium text-gray-900 truncate">
                                                    {doc.filename}
                                                </p>
                                                <StatusBadge status={doc.status} />
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <FolderOpen className="w-4 h-4" />
                                                    <span>{doc.catalog.name}</span>
                                                </div>
                                                
                                                {doc.status === 'completed' && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-400">Type:</span>
                                                        <DocumentTypeDisplay 
                                                            type={doc.documentType || undefined}
                                                            confidence={doc.confidence || undefined}
                                                        />
                                                    </div>
                                                )}
                                                
                                                <span className="text-xs">
                                                    {new Date(doc.createdAt).toLocaleString()}
                                                </span>
                                            </div>

                                            {doc.status === 'failed' && doc.error && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    Error: {doc.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {/* Document Details Modal */}
            <DocumentDetailsModal 
                document={selectedDocument || null}
                open={modalOpen}
                onClose={handleCloseModal}
            />
        </div>
    )
}
