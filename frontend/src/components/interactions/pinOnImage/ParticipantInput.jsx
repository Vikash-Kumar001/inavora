import { useState, useRef, useEffect } from 'react';
import { MapPin, Send } from 'lucide-react';

const PinOnImageParticipantInput = ({ 
  slide, 
  onSubmit, 
  hasSubmitted,
  pinResults = [],
  totalResponses = 0
}) => {
  const [pin, setPin] = useState(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const imageUrl = slide?.pinOnImageSettings?.imageUrl;

  useEffect(() => {
    // Reset pin when slide changes
    setPin(null);
  }, [slide?.id]);

  const handleImageClick = (e) => {
    if (hasSubmitted) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp values to 0-100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setPin({ x: clampedX, y: clampedY });
  };

  const handleSubmit = async () => {
    if (!pin) return;
    await onSubmit(pin);
  };

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center py-16 text-[#6C6C6C]">
        <p className="text-sm">No image configured</p>
      </div>
    );
  }

  const canSubmit = pin && !hasSubmitted;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-3xl border border-[#2A2A2A] bg-[#1F1F1F] shadow-sm p-8">
        {/* Question */}
        <h2 className="text-2xl font-semibold text-[#E0E0E0] text-center mb-6">
          {slide?.question || 'Place your pin on the image'}
        </h2>

        {/* Instructions */}
        <p className="text-sm text-[#B0B0B0] text-center mb-6">
          {hasSubmitted 
            ? '✓ Your response has been submitted'
            : 'Click on the image to place your pin'
          }
        </p>

        {/* Image Container */}
        <div 
          ref={containerRef}
          className="relative w-full rounded-xl overflow-hidden border-2 border-[#2A2A2A] bg-[#1F1F1F] mb-6"
          style={{ maxHeight: '500px' }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Pin placement"
            onClick={handleImageClick}
            className={`w-full h-auto object-contain ${!hasSubmitted && 'cursor-crosshair'}`}
            style={{ maxHeight: '500px' }}
            draggable={false}
          />

          {/* Render Pin */}
          {pin && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-full animate-bounce-in"
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasSubmitted) setPin(null);
                }}
                disabled={hasSubmitted}
                className={`relative ${!hasSubmitted && 'hover:scale-110'} transition-transform`}
                title={hasSubmitted ? '' : 'Click to remove'}
              >
                <MapPin 
                  className="w-8 h-8 text-[#4CAF50] drop-shadow-lg" 
                  fill="currentColor"
                />
              </button>
            </div>
          )}
        </div>

        {/* Pin Status */}
        {pin && !hasSubmitted && (
          <div className="text-center text-sm text-[#B0B0B0] mb-4">
            Pin placed
          </div>
        )}

        {/* Submit Button */}
        {!hasSubmitted && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-base
                transition-all duration-200 transform
                ${canSubmit
                  ? 'bg-gradient-to-r from-[#388E3C] to-[#2E7D32] hover:from-[#4CAF50] hover:to-[#388E3C] text-white shadow-lg hover:shadow-xl hover:scale-105'
                  : 'bg-[#2A2A2A] text-[#6C6C6C] cursor-not-allowed'
                }
              `}
            >
              <Send className="w-5 h-5" />
              Submit
            </button>
          </div>
        )}

        {/* Live Results */}
        {hasSubmitted && totalResponses > 0 && (
          <div className="mt-6 bg-[#1F1F1F] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#E0E0E0]">Live Pin Results</h3>
              <div className="flex items-center gap-2 text-sm text-[#9E9E9E]">
                <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse"></div>
                <span>{totalResponses} {totalResponses === 1 ? 'pin' : 'pins'}</span>
              </div>
            </div>
            <p className="text-sm text-[#B0B0B0]">
              {pinResults.length} pin{pinResults.length !== 1 ? 's' : ''} placed on the image. Check the presenter view for the heatmap.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            transform: translateX(-50%) translateY(-100%) scale(0);
          }
          50% {
            transform: translateX(-50%) translateY(-100%) scale(1.2);
          }
          100% {
            transform: translateX(-50%) translateY(-100%) scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PinOnImageParticipantInput;
