import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, Link, Upload, X } from 'lucide-react';
import SlideTypeHeader from '../common/SlideTypeHeader';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { translateError } from '../../../utils/errorTranslator';
import { uploadVideo as uploadVideoService } from '../../../services/presentationService';

const VideoEditor = ({ slide, onUpdate }) => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState(slide?.question || '');
  const [videoUrl, setVideoUrl] = useState(slide?.videoUrl || '');
  const [videoPublicId, setVideoPublicId] = useState(slide?.videoPublicId || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('url'); // 'url' or 'file'
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    if (slide) {
      setQuestion(slide.question || '');
      setVideoUrl(slide.videoUrl || '');
      setVideoPublicId(slide.videoPublicId || '');
      
      // If video exists but no publicId, it's likely a URL-based video
      if (slide.videoUrl && !slide.videoPublicId) {
        setUploadMethod('url');
      } else if (slide.videoPublicId) {
        setUploadMethod('file');
      }
    }
  }, [slide]);

  // Process video file (used by file input, drag-drop, and paste)
  const processVideoFile = useCallback(async (file) => {
    if (!file) return;

    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      toast.error(t('slide_editors.video.upload_video_error'));
      return;
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error(t('slide_editors.video.video_size_error'));
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Video = event.target.result;
          
          // Check if base64 string is too large (shouldn't happen, but safety check)
          if (base64Video.length > 200 * 1024 * 1024) { // ~150MB base64
            throw new Error('Video file is too large after encoding. Please use a smaller file.');
          }
          
          const response = await uploadVideoService(base64Video);

          if (response.success) {
            setVideoUrl(response.data.videoUrl);
            setVideoPublicId(response.data.publicId);
            onUpdate({ 
              ...slide, 
              videoUrl: response.data.videoUrl,
              videoPublicId: response.data.publicId
            });
            toast.success(t('slide_editors.video.upload_success'));
            // Switch to file method after successful upload
            setUploadMethod('file');
          }
        } catch (error) {
          console.error('Upload error:', error);
          let errorMessage = 'Failed to upload video';
          
          // Extract more specific error messages
          if (error?.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          // Check for specific error types
          if (error?.response?.status === 413 || errorMessage.includes('too large') || errorMessage.includes('limit')) {
            toast.error(t('slide_editors.video.video_size_error') + ' ' + errorMessage);
          } else if (error?.response?.status === 400) {
            toast.error(errorMessage || t('slide_editors.video.upload_failed'));
          } else {
            toast.error(translateError(error, t, 'slide_editors.video.upload_failed'));
          }
        } finally {
          setIsUploading(false);
          // Reset file input to allow re-upload
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      
      reader.onerror = () => {
        toast.error(t('slide_editors.video.upload_video_error'));
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Video processing error:', error);
      toast.error(translateError(error, t, 'slide_editors.video.upload_failed'));
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [slide, onUpdate, t]);

  // Handle paste event for clipboard videos
  useEffect(() => {
    const handlePaste = async (e) => {
      // Only handle paste when the editor is focused/active
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('video') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await processVideoFile(file);
          }
          break;
        }
      }
    };

    // Add paste event listener to the document
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [processVideoFile]);

  const handleQuestionChange = (value) => {
    setQuestion(value);
    onUpdate({ ...slide, question: value });
  };

  const handleVideoUrlChange = (value) => {
    setVideoUrl(value);
    onUpdate({ ...slide, videoUrl: value });
  };

  // Extract video ID from YouTube URL for preview
  const getYoutubeEmbedUrl = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  // Check if URL is a valid video URL
  const isValidVideoUrl = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  // Clean Cloudinary URL by removing transformation parameters that might cause 400 errors
  // This fixes broken eager transformation URLs
  const cleanCloudinaryUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }
    
    // If URL contains transformation parameters (like /br_auto,f_auto,q_auto:eco/)
    // and it's a video URL, try to get the base URL
    // Pattern: https://res.cloudinary.com/cloud_name/video/upload/transformations/v1234567/folder/file.ext
    const cloudinaryVideoPattern = /(https:\/\/res\.cloudinary\.com\/[^\/]+\/video\/upload\/)([^\/]+\/)(v\d+\/.*)/;
    const match = url.match(cloudinaryVideoPattern);
    
    if (match) {
      // Reconstruct URL without transformation parameters
      // Format: https://res.cloudinary.com/cloud_name/video/upload/v1234567/folder/file.ext
      return `${match[1]}${match[3]}`;
    }
    
    // If pattern doesn't match, return original URL
    return url;
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    await processVideoFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await processVideoFile(file);
    }
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
    setVideoPublicId('');
    onUpdate({ 
      ...slide, 
      videoUrl: '',
      videoPublicId: null
    });
  };

  return (
    <div 
      className="h-full overflow-y-auto scrollbar-thin bg-[#1F1F1F] text-[#E0E0E0]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={dropZoneRef}
    >
      <SlideTypeHeader type="video" />

      <div className="p-4 border-b border-[#2A2A2A]">
        <label className="block text-sm font-medium text-[#E0E0E0] mb-2">
          {t('slide_editors.video.title_label')}
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          className="w-full px-3 py-2 border border-[#2A2A2A] rounded-lg text-sm bg-[#232323] text-[#E0E0E0] placeholder-[#8A8A8A] focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent outline-none"
          placeholder={t('slide_editors.video.title_placeholder')}
        />
      </div>

      <div className="p-4 border-b border-[#2A2A2A]">
        <label className="block text-sm font-medium text-[#E0E0E0] mb-2">
          {t('slide_editors.video.video_label')}
        </label>
        
        {videoUrl ? (
          <div className="space-y-3">
            <div className="relative">
              {isValidVideoUrl(videoUrl) ? (
                <div className="rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#232323]">
                  <div className="aspect-video bg-black flex items-center justify-center">
                    <iframe
                      src={getYoutubeEmbedUrl(videoUrl)}
                      title={t('slide_editors.video.preview_title')}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#232323]">
                  <div className="aspect-video bg-black flex items-center justify-center">
                    <video
                      src={cleanCloudinaryUrl(videoUrl)}
                      controls
                      className="w-full h-full"
                      onError={(e) => {
                        // If video fails to load, try the original URL without transformations
                        const cleanedUrl = cleanCloudinaryUrl(videoUrl);
                        if (e.target.src !== videoUrl && cleanedUrl !== videoUrl) {
                          e.target.src = videoUrl;
                        } else {
                          toast.error(t('slide_editors.video.video_load_error'));
                        }
                      }}
                    >
                      {t('slide_editors.video.video_not_supported')}
                    </video>
                  </div>
                </div>
              )}
              <button
                onClick={handleRemoveVideo}
                className="absolute top-2 right-2 p-1.5 bg-[#EF5350] rounded-full hover:bg-[#E53935] transition-colors"
                title={t('slide_editors.video.remove_video_title')}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upload Method Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUploadMethod('url')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  uploadMethod === 'url'
                    ? 'bg-[#4CAF50] text-white'
                    : 'bg-[#2A2A2A] text-[#9E9E9E] hover:bg-[#333333]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Link className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('slide_editors.video.add_url')}</span>
                </div>
              </button>
              <button
                onClick={() => setUploadMethod('file')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  uploadMethod === 'file'
                    ? 'bg-[#4CAF50] text-white'
                    : 'bg-[#2A2A2A] text-[#9E9E9E] hover:bg-[#333333]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('slide_editors.video.upload_file')}</span>
                </div>
              </button>
            </div>

            {/* URL Input Method */}
            {uploadMethod === 'url' && (
              <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-6 bg-[#232323]">
                <div className="flex items-center justify-center mb-3">
                  <Link className="h-10 w-10 text-[#9E9E9E]" />
                </div>
                <p className="text-sm text-[#9E9E9E] mb-3 text-center">{t('slide_editors.video.url_prompt')}</p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link className="h-4 w-4 text-[#9E9E9E]" />
                  </div>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-[#2A2A2A] rounded-lg text-sm bg-[#1F1F1F] text-[#E0E0E0] placeholder-[#8A8A8A] focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent outline-none"
                    placeholder={t('slide_editors.video.url_placeholder', { 
                      youtube: t('slide_editors.video.youtube_label'),
                      video: t('slide_editors.video.video_label')
                    })}
                  />
                </div>
                <p className="text-xs text-[#7E7E7E] mt-2 text-center">{t('slide_editors.video.url_hint', { 
                  youtube: t('slide_editors.video.youtube_label'),
                  video: t('slide_editors.video.video_label')
                })}</p>
              </div>
            )}

            {/* File Upload Method */}
            {uploadMethod === 'file' && (
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center bg-[#232323] transition-all ${
                  isDragging 
                    ? 'border-[#4CAF50] bg-[#2A3A2A] scale-[1.02]' 
                    : 'border-[#2A2A2A] hover:border-[#4CAF50]/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Video className={`h-10 w-10 mx-auto mb-3 transition-colors ${
                  isDragging ? 'text-[#4CAF50]' : 'text-[#9E9E9E]'
                }`} />
                <p className={`text-sm mb-3 transition-colors ${
                  isDragging ? 'text-[#4CAF50] font-medium' : 'text-[#9E9E9E]'
                }`}>
                  {isDragging 
                    ? t('slide_editors.video.drop_video_here') || 'Drop video here'
                    : t('slide_editors.video.upload_prompt')}
                </p>
                <label className="inline-flex items-center px-4 py-2 bg-[#4CAF50] text-white rounded-lg hover:bg-[#43A047] transition-colors cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? t('slide_editors.video.uploading') : t('slide_editors.video.choose_file')}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                <p className="text-xs text-[#7E7E7E] mt-2">
                  {t('slide_editors.video.max_size')} • {t('slide_editors.video.drag_drop_hint') || 'Drag & drop or paste video'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoEditor;