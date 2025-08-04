'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  mimeType?: string
  content?: string // Base64 encoded content
  createdAt: Date
  parentId: string | null
}

export default function CloudDrivePage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // Inicializar aplicación
  useEffect(() => {
    const initApp = async () => {
      try {
        setIsInitializing(true)
        
        // Cargar archivos del localStorage
        const savedFiles = localStorage.getItem('cloudDriveFiles')
        if (savedFiles) {
          try {
            const parsedFiles = JSON.parse(savedFiles).map((file: any) => ({
              ...file,
              createdAt: new Date(file.createdAt)
            }))
            setFiles(parsedFiles)
          } catch (err) {
            console.error('Error loading saved files:', err)
          }
        }
        
        console.log('CloudDrive initialized successfully')
      } catch (err) {
        console.error('Error initializing app:', err)
        setError('Error al inicializar la aplicación.')
      } finally {
        setIsInitializing(false)
      }
    }

    initApp()
  }, [])

  // Guardar archivos en localStorage
  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem('cloudDriveFiles', JSON.stringify(files))
    }
  }, [files])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setUploadProgress((i / selectedFiles.length) * 50)

        // Leer archivo como base64
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        setUploadProgress(((i / selectedFiles.length) * 50) + 25)

        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 200))

        // Crear entrada de archivo
        const newFile: FileItem = {
          id: crypto.randomUUID(),
          name: file.name,
          type: 'file',
          size: file.size,
          mimeType: file.type,
          content: base64Content,
          createdAt: new Date(),
          parentId: currentFolder
        }

        setFiles(prev => [...prev, newFile])
        setUploadProgress(((i + 1) / selectedFiles.length) * 100)
      }

      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 500)

    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Error al subir archivo. Inténtalo de nuevo.')
      setIsUploading(false)
      setUploadProgress(0)
    }

    // Reset input
    event.target.value = ''
  }

  const createFolder = () => {
    const folderName = prompt('Nombre de la carpeta:')
    if (!folderName) return

    const newFolder: FileItem = {
      id: crypto.randomUUID(),
      name: folderName,
      type: 'folder',
      createdAt: new Date(),
      parentId: currentFolder
    }

    setFiles(prev => [...prev, newFolder])
  }

  const openFolder = (folderId: string) => {
    setCurrentFolder(folderId)
  }

  const goBack = () => {
    const currentFolderItem = files.find(f => f.id === currentFolder)
    setCurrentFolder(currentFolderItem?.parentId || null)
  }

  const downloadFile = (file: FileItem) => {
    if (!file.content) return

    try {
      const link = document.createElement('a')
      link.href = file.content
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error downloading file:', err)
      setError('Error al descargar archivo.')
    }
  }

  const shareFile = (file: FileItem) => {
    if (!file.content) return
    
    // Simular enlace de compartir
    const shareId = btoa(file.id).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)
    const shareUrl = `https://clouddrive.app/share/${shareId}`
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`Enlace de compartir copiado al portapapeles:\n${shareUrl}\n\n(Nota: Este es un enlace simulado para demostración)`)
    }).catch(() => {
      alert(`Enlace de compartir:\n${shareUrl}\n\n(Nota: Este es un enlace simulado para demostración)`)
    })
  }

  const deleteFile = (fileId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
      setFiles(prev => prev.filter(f => f.id !== fileId))
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const filteredFiles = files.filter(file => 
    file.parentId === currentFolder &&
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentFolderItem = files.find(f => f.id === currentFolder)
  const breadcrumbs: FileItem[] = []
  let tempFolder: FileItem | undefined = currentFolderItem
  while (tempFolder) {
    breadcrumbs.unshift(tempFolder)
    tempFolder = files.find(f => f.id === tempFolder!.parentId)
  }

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0)

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <h2 className="text-xl font-semibold">Inicializando CloudDrive</h2>
              <p className="text-gray-600">Preparando tu almacenamiento ilimitado...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">CloudDrive</h1>
            <div className="text-sm text-gray-500">
              Almacenamiento Ilimitado • Gratuito • Descentralizado
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Sistema Activo</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 shadow-sm">
          <div className="space-y-4">
            <div>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label htmlFor="file-upload">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  disabled={isUploading}
                  asChild
                >
                  <span className="cursor-pointer">
                    {isUploading ? 'Subiendo...' : '+ Subir Archivos'}
                  </span>
                </Button>
              </label>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={createFolder}
            >
              📁 Nueva Carpeta
            </Button>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Almacenamiento</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Usado:</span>
                  <span className="font-medium">{formatFileSize(totalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Disponible:</span>
                  <span className="text-green-600 font-bold">∞ Ilimitado</span>
                </div>
                <div className="flex justify-between">
                  <span>Archivos:</span>
                  <span className="font-medium">{files.filter(f => f.type === 'file').length}</span>
                </div>
              </div>
              <div className="bg-green-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-0"></div>
              </div>
              <p className="text-xs text-gray-500">
                🌐 Almacenamiento descentralizado simulado
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Características</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Almacenamiento ilimitado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Completamente gratuito</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Sin registro requerido</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Compartir archivos</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2 h-auto p-0 text-red-600 hover:text-red-800"
                  onClick={() => setError(null)}
                >
                  ✕
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <Card className="mb-4 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-blue-800">
                    <span>📤 Subiendo archivos al almacenamiento...</span>
                    <span className="font-medium">{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentFolder(null)}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              🏠 Mi Drive
            </Button>
            {breadcrumbs.map((folder, index) => (
              <div key={folder.id} className="flex items-center space-x-2">
                <span className="text-gray-400">/</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentFolder(folder.id)}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="🔍 Buscar archivos y carpetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Files Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentFolder && (
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-gray-200"
                onClick={goBack}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">⬅️</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Volver</p>
                      <p className="text-sm text-gray-500">Carpeta anterior</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredFiles.map((file) => (
              <Card 
                key={file.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 group border-gray-200"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        {file.type === 'folder' ? (
                          <span className="text-xl">📁</span>
                        ) : file.mimeType?.startsWith('image/') ? (
                          <span className="text-xl">🖼️</span>
                        ) : file.mimeType?.startsWith('video/') ? (
                          <span className="text-xl">🎥</span>
                        ) : file.mimeType?.startsWith('audio/') ? (
                          <span className="text-xl">🎵</span>
                        ) : file.mimeType?.includes('pdf') ? (
                          <span className="text-xl">📄</span>
                        ) : (
                          <span className="text-xl">📄</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {file.type === 'folder' ? 'Carpeta' : formatFileSize(file.size)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {file.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.type === 'folder' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openFolder(file.id)}
                          className="text-xs"
                        >
                          Abrir
                        </Button>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadFile(file)}
                            className="text-xs"
                          >
                            Descargar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => shareFile(file)}
                            className="text-xs"
                          >
                            Compartir
                          </Button>
                        </>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteFile(file.id)}
                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFiles.length === 0 && !isUploading && (
            <div className="text-center py-16">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl">
                  {searchQuery ? '🔍' : currentFolder ? '📁' : '☁️'}
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                {searchQuery ? 'No se encontraron archivos' : 'Esta carpeta está vacía'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? 'Intenta con otros términos de búsqueda o revisa la ortografía'
                  : 'Comienza subiendo archivos o creando carpetas para organizar tu contenido'
                }
              </p>
              {!searchQuery && (
                <div className="space-x-3">
                  <label htmlFor="file-upload">
                    <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                      <span className="cursor-pointer">📤 Subir Archivos</span>
                    </Button>
                  </label>
                  <Button variant="outline" onClick={createFolder}>
                    📁 Nueva Carpeta
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
