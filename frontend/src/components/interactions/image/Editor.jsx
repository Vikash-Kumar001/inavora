import { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import SlideTypeHeader from '../common/SlideTypeHeader';
import api from '../../../config/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { translateError } from '../../../utils/errorTranslator';

const ImageEditor = ({ slide, onUpdate }) => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState(slide?.question || '');
  const [imageUrl, setImageUrl] = useState(slide?.imageUrl || '');
  const [imagePublicId, setImagePublicId] = useState(slide?.imagePublicId || '');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (slide) {
      setQuestion(slide.question || '');
      setImageUrl(slide.imageUrl || '');
      setImagePublicId(slide.imagePublicId || '');
    }
  }, [slide]);

  const handleQuestionChange = (value) => {
    setQuestion(value);
    onUpdate({ ...slide, question: value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast.error(t('slide_editors.image.upload_image_error'));
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('slide_editors.image.image_size_error'));
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setImageUrl(response.data.url);
        setImagePublicId(response.data.publicId);
        onUpdate({ 
          ...slide, 
          imageUrl: response.data.url,
          imagePublicId: response.data.publicId
        });
        toast.success(t('slide_editors.image.upload_success'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(translateError(error, t, 'slide_editors.image.upload_failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImagePublicId('');
    onUpdate({ 
      ...slide, 
      imageUrl: '',
      imagePublicId: null
    });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-[#1F1F1F] text-[#E0E0E0]">
      <SlideTypeHeader type="image" />

      <div className="p-4 border-b border-[#2A2A2A]">
        <label className="block text-sm font-medium text-[#E0E0E0] mb-2">
          {t('slide_editors.image.title_label')}
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          className="w-full px-3 py-2 border border-[#2A2A2A] rounded-lg text-sm bg-[#232323] text-[#E0E0E0] placeholder-[#8A8A8A] focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent outline-none"
          placeholder={t('slide_editors.image.title_placeholder')}
        />
      </div>

      <div className="p-4 border-b border-[#2A2A2A]">
        <label className="block text-sm font-medium text-[#E0E0E0] mb-2">
          {t('slide_editors.image.image_label')}
        </label>
        
        {imageUrl ? (
          <div className="relative">
            <img 
              src={imageUrl} 
              alt="Uploaded" 
              className="w-full h-48 object-contain rounded-lg border border-[#2A2A2A] bg-[#232323]"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1.5 bg-[#EF5350] rounded-full hover:bg-[#E53935] transition-colors"
              title={t('slide_editors.image.remove_image_title')}
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-6 text-center bg-[#232323]">
            <ImageIcon className="h-10 w-10 text-[#9E9E9E] mx-auto mb-3" />
            <p className="text-sm text-[#9E9E9E] mb-3">{t('slide_editors.image.upload_prompt')}</p>
            <label className="inline-flex items-center px-4 py-2 bg-[#4CAF50] text-white rounded-lg hover:bg-[#43A047] transition-colors cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? t('slide_editors.image.uploading') : t('slide_editors.image.choose_file')}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            <p className="text-xs text-[#7E7E7E] mt-2">{t('slide_editors.image.max_size')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;