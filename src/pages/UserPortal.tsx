import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2, 
  Eye,
  Printer,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  pages?: number;
  status: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'error';
  progress?: number;
  url?: string;
  error?: string;
}

interface PrintSettings {
  copies: number;
  paperSize: string;
  colorType: 'color' | 'blackwhite';
  paperQuality: string;
}

const UserPortal = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    copies: 1,
    paperSize: 'A4',
    colorType: 'blackwhite',
    paperQuality: 'standard'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Price calculation constants
  const basePricePerPage = 5; // Base price per page in Taka

  // Computed values
  const readyFiles = files.filter(f => f.status === 'ready');
  const totalPages = readyFiles.reduce((sum, file) => sum + (file.pages || 0), 0);
  const totalCost = totalPages * printSettings.copies * 
    (printSettings.colorType === 'color' ? basePricePerPage * 2 : basePricePerPage) *
    (printSettings.paperQuality === 'premium' ? 1.5 : 1);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || !user) return;

    Array.from(selectedFiles).forEach((file) => {
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      };

      setFiles(prev => [...prev, newFile]);

      // Start actual upload
      uploadFile(file, newFile.id);
    });
  };

  const uploadFile = async (file: File, fileId: string) => {
    if (!user) return;

    try {
      // Create file path with user ID folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Simulate upload progress since Supabase doesn't provide native progress tracking
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === fileId && f.progress !== undefined && f.progress < 90) {
            return { ...f, progress: f.progress + 10 };
          }
          return f;
        }));
      }, 200);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      // Set progress to 100% and status to processing
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, progress: 100, status: 'processing' }
          : f
      ));

      // Get signed URL for viewing the file
      const { data: urlData } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      // Simulate processing time and page detection
      setTimeout(() => {
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                status: 'ready', 
                url: urlData?.signedUrl,
                pages: Math.floor(Math.random() * 10) + 1 // Mock page count
              }
            : f
        ));
      }, 1500);

    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'error', 
              progress: 0,
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ));

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Upload & Print
              </h1>
              <p className="text-muted-foreground">
                Upload your documents and get them printed at nearby shops
              </p>
            </div>

            {/* Before Upload: Show only Upload Documents card */}
            {files.length === 0 && (
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="w-5 h-5" />
                      <span>Upload Documents</span>
                    </CardTitle>
                    <CardDescription>
                      Support for PDF, DOC, DOCX, JPG, PNG files up to 10MB each
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                        isDragging 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                      <h3 className="text-xl font-semibold mb-3">
                        Drag & drop files here
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        or click to browse your files
                      </p>
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        size="lg"
                        className="mb-4"
                      >
                        Choose Files
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                      />
                      <p className="text-sm text-muted-foreground">
                        Maximum file size: 10MB per file
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* After Upload: Show full workflow */}
            {files.length > 0 && (
              <div className="space-y-8">
                {/* Row 1: Upload Documents, Print Settings, Order Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Col 1: Upload Documents */}
                  <Card>
                    <CardHeader>
                      {/* <CardTitle className="flex items-center space-x-2">
                        <Upload className="w-5 h-5" />
                        <span>Upload More</span>
                      </CardTitle>
                      <CardDescription>
                        Add more documents
                      </CardDescription> */}
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          isDragging 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                      >
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Drag & drop or click
                        </p>
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          size="sm"
                          variant="outline"
                        >
                          Browse Files
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileSelect(e.target.files)}
                          className="hidden"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Col 2: Print Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Printer className="w-5 h-5" />
                        <span>Print Settings</span>
                      </CardTitle>
                      <CardDescription>
                        Configure your print options
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Copies and Paper Size */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="copies" className="text-xs">Copies</Label>
                          <Input
                            id="copies"
                            type="number"
                            min="1"
                            max="100"
                            value={printSettings.copies}
                            onChange={(e) => setPrintSettings(prev => ({
                              ...prev,
                              copies: parseInt(e.target.value) || 1
                            }))}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Paper Size</Label>
                          <Select
                            value={printSettings.paperSize}
                            onValueChange={(value) => setPrintSettings(prev => ({
                              ...prev,
                              paperSize: value
                            }))}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A4">A4</SelectItem>
                              <SelectItem value="A3">A3</SelectItem>
                              <SelectItem value="Letter">Letter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Color Type */}
                      <div className="space-y-2">
                        <Label className="text-xs">Print Type</Label>
                        <RadioGroup
                          value={printSettings.colorType}
                          onValueChange={(value: 'color' | 'blackwhite') => 
                            setPrintSettings(prev => ({ ...prev, colorType: value }))
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="blackwhite" id="bw" />
                            <Label htmlFor="bw" className="text-xs">B&W</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="color" id="color" />
                            <Label htmlFor="color" className="text-xs">Color</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Paper Quality */}
                      <div className="space-y-2">
                        <Label className="text-xs">Quality</Label>
                        <RadioGroup
                          value={printSettings.paperQuality}
                          onValueChange={(value) => 
                            setPrintSettings(prev => ({ ...prev, paperQuality: value }))
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="standard" id="std" />
                            <Label htmlFor="std" className="text-xs">Standard</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="premium" id="prem" />
                            <Label htmlFor="prem" className="text-xs">Premium</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Col 3: Order Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5" />
                        <span>Order Summary</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Files:</span>
                          <span>{readyFiles.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pages:</span>
                          <span>{totalPages}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Copies:</span>
                          <span>{printSettings.copies}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span>{printSettings.colorType === 'color' ? 'Color' : 'B&W'}</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span>৳{totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {readyFiles.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <Button 
                            className="w-full" 
                            size="sm"
                            onClick={() => navigate('/find-shops', { 
                              state: { 
                                files: readyFiles,
                                printSettings: printSettings,
                                totalCost: totalCost
                              } 
                            })}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Find Print Shop
                          </Button>
                          <Button variant="outline" size="sm" className="w-full">
                            <Clock className="w-4 h-4 mr-2" />
                            Schedule Later
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Uploaded Files (spans 2 columns) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Uploaded Files ({files.length})</CardTitle>
                        <CardDescription>
                          Manage your uploaded documents
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {files.map((file) => (
                            <div key={file.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                              <div className="flex items-center space-x-3 flex-1">
                                {getFileIcon(file.type)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{file.name}</p>
                                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <span>{formatFileSize(file.size)}</span>
                                    {file.pages && (
                                      <>
                                        <span>•</span>
                                        <span>{file.pages} pages</span>
                                      </>
                                    )}
                                  </div>
                                  {file.status === 'uploading' && file.progress !== undefined && (
                                    <Progress value={file.progress} className="mt-2" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant={
                                  file.status === 'uploading' ? 'secondary' :
                                  file.status === 'processing' ? 'secondary' :
                                  file.status === 'ready' ? 'default' : 
                                  file.status === 'error' ? 'destructive' : 'secondary'
                                }>
                                  {file.status === 'uploading' ? 'Uploading...' :
                                   file.status === 'processing' ? 'Processing...' :
                                   file.status === 'ready' ? 'Ready' : 
                                   file.status === 'error' ? 'Error' : file.status}
                                </Badge>
                                {file.status === 'ready' && file.url && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(file.url, '_blank')}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                )}
                                {file.status === 'error' && file.error && (
                                  <div className="text-xs text-destructive max-w-32 truncate" title={file.error}>
                                    {file.error}
                                  </div>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => removeFile(file.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default UserPortal;