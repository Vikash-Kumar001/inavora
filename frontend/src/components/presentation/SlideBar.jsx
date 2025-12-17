import { useEffect, useRef, useState, useCallback } from 'react';
import { BarChart3, Cloud, MessageSquare, Sliders, ChartBarDecreasing, Plus, X, MessagesSquare, CircleQuestionMark, SquareStack, Grid2X2, MapPin, Brain, Trophy, GripVertical, Settings, FileText, Presentation, Monitor, Upload, Type, Image, Video, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SlideBar = ({ slides, currentSlideIndex, onSlideSelect, onDeleteSlide, onNewSlideClick, showNewSlideDropdown, onSlideReorder, isHorizontal = false, onEditSlide }) => {
  const { t } = useTranslation();
  const itemRefs = useRef([]);
  const containerRef = useRef(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Touch drag state - using refs for performance
  const touchDragStateRef = useRef({
    isActive: false,
    startIndex: null,
    startX: null,
    startY: null,
    currentX: null,
    currentY: null,
    draggedElement: null,
  });
  const [touchDragActive, setTouchDragActive] = useState(false);

  // Auto-scroll state - using refs to avoid re-renders
  const scrollAnimationRef = useRef(null);
  const scrollSpeedRef = useRef(0);
  const lastScrollTimeRef = useRef(0);
  const lastAutoScrollCheckRef = useRef(0);
  const currentPositionRef = useRef({ x: 0, y: 0 });
  
  // Auto-scroll configuration
  const EDGE_THRESHOLD = 60; // Distance from edge in pixels to trigger scroll
  const MAX_SCROLL_SPEED = 40; // Maximum pixels per frame (increased for faster scrolling)
  const SCROLL_DECELERATION = 0.92; // How quickly scroll speed decreases
  const AUTO_SCROLL_THROTTLE = 16; // Throttle auto-scroll checks to ~60fps

  useEffect(() => {
    const currentItem = itemRefs.current[currentSlideIndex];
    if (currentItem && typeof currentItem.scrollIntoView === 'function') {
      if (isHorizontal) {
        currentItem.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      } else {
        currentItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentSlideIndex, slides.length, isHorizontal]);

  // Render actual slide content preview instead of icons
  const renderSlidePreview = (slide) => {
    const question = slide?.question || '';
    // Adjust truncation based on layout
    const maxLength = isHorizontal ? 15 : 25;
    const truncatedQuestion = question.length > maxLength ? question.substring(0, maxLength) + '...' : question;

    switch (slide?.type) {
      case 'multiple_choice': {
        const options = slide?.options || [];
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_types.multiple_choice')}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              {options.slice(0, 3).map((opt, idx) => (
                <div key={opt.id || opt.text || `mc-opt-${idx}`} className="h-1.5 bg-[#2A2A2A] rounded-sm flex items-center px-1">
                  <div className="h-0.5 bg-[#4CAF50] rounded-sm" style={{ width: `${(idx + 1) * 30}%` }}></div>
                </div>
              ))}
              {options.length === 0 && (
                <div className="text-[5px] text-[#6C6C6C] text-center">{t('slide_editors.pick_answer.add_options')}</div>
              )}
            </div>
          </div>
        );
      }

      case 'quiz': {
        const quizOptions = slide?.quizSettings?.options || [];
        const correctOptionId = slide?.quizSettings?.correctOptionId;
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#111111] to-[#0A0A0A]">
            <div className="flex items-center justify-between">
              <span className="text-[5px] text-[#4CAF50] font-bold">QUIZ</span>
              <span className="text-[5px] text-[#6C6C6C]">{slide?.quizSettings?.timeLimit || 30}s</span>
            </div>
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.quiz.default_title')}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              {quizOptions.slice(0, 2).map((opt, idx) => {
                const isCorrect = opt.id === correctOptionId;
                return (
                  <div key={opt.id || idx} className={`h-1.5 rounded-sm px-1 flex items-center ${isCorrect ? 'bg-[#1D2A20] border-l border-[#4CAF50]' : 'bg-[#181818]'}`}>
                    <span className="text-[5px] text-[#E0E0E0] line-clamp-1">{opt.text || t('slide_editors.quiz.option_placeholder', { number: idx + 1 })}</span>
                  </div>
                );
              })}
              {quizOptions.length === 0 && (
                <div className="text-[5px] text-[#6C6C6C] text-center">{t('slide_editors.pick_answer.add_options')}</div>
              )}
            </div>
          </div>
        );
      }

      case 'word_cloud':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.word_cloud.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-wrap gap-0.5 items-center justify-center">
                <Cloud className="h-4 w-4 text-[#4CAF50]" />
              </div>
            </div>
          </div>
        );

      case 'open_ended':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.open_ended.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-4 border border-dashed border-[#3A3A3A] rounded-sm bg-[#252525] flex items-center justify-center">
                <span className="text-[5px] text-[#6C6C6C]">{t('slide_editors.open_ended.responses')}</span>
              </div>
            </div>
          </div>
        );

      case 'scales': {
        const statements = slide?.statements || [];
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.scales.default_title')}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              {statements.slice(0, 2).map((stmt, idx) => (
                <div key={stmt.id || stmt.text || `stmt-${idx}`} className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-[#388E3C] flex-shrink-0"></div>
                  <div className="flex-1 h-0.5 bg-[#303030] rounded-sm"></div>
                </div>
              ))}
              {statements.length === 0 && (
                <div className="text-[5px] text-[#6C6C6C] text-center">{t('slide_editors.scales.add_statements')}</div>
              )}
            </div>
          </div>
        );
      }

      case 'ranking': {
        const rankingItems = slide?.rankingItems || [];
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.ranking.default_title')}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              {rankingItems.slice(0, 3).map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-sm bg-[#388E3C] flex items-center justify-center flex-shrink-0">
                    <span className="text-[4px] text-white font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 h-1 bg-[#262626] rounded-sm"></div>
                </div>
              ))}
              {rankingItems.length === 0 && (
                <div className="text-[5px] text-[#6C6C6C] text-center">{t('slide_editors.ranking.add_items')}</div>
              )}
            </div>
          </div>
        );
      }

      case 'hundred_points': {
        const hundredPointsItems = slide?.hundredPointsItems || [];
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.hundred_points.default_title')}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              {hundredPointsItems.slice(0, 2).map((item, idx) => (
                <div key={item.id || idx} className="flex items-center justify-between gap-1">
                  <div className="flex-1 h-1 bg-[#262626] rounded-sm"></div>
                  <span className="text-[5px] text-[#4CAF50] font-bold">0</span>
                </div>
              ))}
              {hundredPointsItems.length === 0 && (
                <div className="text-[5px] text-[#6C6C6C] text-center">{t('slide_editors.hundred_points.add_items')}</div>
              )}
            </div>
          </div>
        );
      }

      case '2x2_grid': {
        const gridItems = slide?.gridItems || [];
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.two_by_two_grid.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 grid grid-cols-2 grid-rows-2 gap-px border border-[#2F2F2F] rounded-sm bg-[#2F2F2F]">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="bg-[#232323] flex items-center justify-center">
                    {gridItems[idx] && (
                      <div className="w-1 h-1 rounded-full bg-[#4CAF50]"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'pin_on_image': {
        const imageUrl = slide?.pinOnImageSettings?.imageUrl;
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.pin_on_image.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center relative bg-[#232323] rounded-sm border border-[#2F2F2F] overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
              ) : (
                <MapPin className="h-3 w-3 text-[#6C6C6C]" />
              )}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-1 h-1 bg-[#4CAF50] rounded-full"></div>
              </div>
            </div>
          </div>
        );
      }

      case 'qna':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.qna.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-4 border border-dashed border-[#3A3A3A] rounded-sm bg-[#252525] flex items-center justify-center">
                <MessagesSquare className="h-2 w-2 text-[#4CAF50]" />
              </div>
            </div>
          </div>
        );

      case 'leaderboard':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#111111] to-[#0A0A0A]">
            <div className="flex items-center justify-center gap-0.5">
              <Trophy className="h-2 w-2 text-[#FFD700]" />
              <span className="text-[5px] text-[#FFD700] font-bold">LEADERBOARD</span>
            </div>
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    idx === 0 ? 'bg-[#FFD700]' : idx === 1 ? 'bg-[#C0C0C0]' : 'bg-[#CD7F32]'
                  }`}>
                    <span className="text-[4px] text-[#1F1F1F] font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 h-1 bg-[#262626] rounded-sm"></div>
                  <span className="text-[5px] text-[#4CAF50] font-bold">0</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'guess_number':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.guess_number.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-[10px] font-bold text-[#4CAF50]">?</div>
            </div>
          </div>
        );

      // Present Your Content section
      case 'text':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.text.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <Type className="h-3 w-3 text-[#2196F3]" />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.image.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <Image className="h-3 w-3 text-[#4CAF50]" />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.video.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <Video className="h-3 w-3 text-[#F44336]" />
            </div>
          </div>
        );

      case 'instruction':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.instruction.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <BookOpen className="h-3 w-3 text-[#9C27B0]" />
            </div>
          </div>
        );

      // Challenge Mode section
      case 'pick_answer': {
        const options = slide?.options || [];
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.pick_answer.pick_the_answer')}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 justify-center">
              {options.slice(0, 3).map((opt, idx) => (
                <div key={opt.id || opt.text || `pick-opt-${idx}`} className="h-1.5 bg-[#2A2A2A] rounded-sm flex items-center px-1">
                  <div className="h-0.5 bg-[#4CAF50] rounded-sm" style={{ width: `${(idx + 1) * 30}%` }}></div>
                </div>
              ))}
              {options.length === 0 && (
                <div className="text-[5px] text-[#6C6C6C] text-center">{t('slide_editors.pick_answer.add_options')}</div>
              )}
            </div>
          </div>
        );
      }

      case 'type_answer':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.type_answer.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-4 border border-dashed border-[#3A3A3A] rounded-sm bg-[#252525] flex items-center justify-center">
                <span className="text-[5px] text-[#6C6C6C]">{t('slide_editors.type_answer.participant_prompt')}</span>
              </div>
            </div>
          </div>
        );

      // Bring Your Slides In section
      case 'miro':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.miro.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <FileText className="h-3 w-3 text-[#009688]" />
            </div>
          </div>
        );

      case 'powerpoint':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.powerpoint.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <Presentation className="h-3 w-3 text-[#D84315]" />
            </div>
          </div>
        );

      case 'google_slides':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_editors.google_slides.default_title')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <Monitor className="h-3 w-3 text-[#4285F4]" />
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="w-full h-full p-1.5 flex flex-col gap-1 bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] sm:text-[7px] font-semibold text-[#E0E0E0] text-center leading-tight line-clamp-1">
              {truncatedQuestion || t('slide_types.upload')}
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#232323] rounded-sm border border-[#2F2F2F]">
              <Upload className="h-3 w-3 text-[#4CAF50]" />
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1F1F1F] to-[#181818]">
            <div className="text-[6px] text-[#6C6C6C] text-center">{truncatedQuestion || 'Slide'}</div>
          </div>
        );
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index);
    // Add visual feedback
    if (e.target) {
      e.target.style.opacity = '0.5';
    }
  };

  // Optimized auto-scroll functionality with useCallback - Define these first to avoid hoisting issues
  const stopAutoScroll = useCallback(() => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
    scrollSpeedRef.current = 0;
  }, []);

  const calculateScrollSpeed = useCallback((clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return 0;

    // Cache container rect to avoid repeated getBoundingClientRect calls
    const containerRect = container.getBoundingClientRect();
    let distanceFromEdge = 0;
    let scrollDirection = 0;

    if (isHorizontal) {
      const distanceFromLeft = clientX - containerRect.left;
      const distanceFromRight = containerRect.right - clientX;

      if (distanceFromLeft < EDGE_THRESHOLD) {
        distanceFromEdge = EDGE_THRESHOLD - distanceFromLeft;
        scrollDirection = -1;
      } else if (distanceFromRight < EDGE_THRESHOLD) {
        distanceFromEdge = EDGE_THRESHOLD - distanceFromRight;
        scrollDirection = 1;
      } else {
        return 0;
      }
    } else {
      const distanceFromTop = clientY - containerRect.top;
      const distanceFromBottom = containerRect.bottom - clientY;

      if (distanceFromTop < EDGE_THRESHOLD) {
        distanceFromEdge = EDGE_THRESHOLD - distanceFromTop;
        scrollDirection = -1;
      } else if (distanceFromBottom < EDGE_THRESHOLD) {
        distanceFromEdge = EDGE_THRESHOLD - distanceFromBottom;
        scrollDirection = 1;
      } else {
        return 0;
      }
    }

    // Optimized speed calculation using linear interpolation for smoother response
    const normalizedDistance = Math.min(distanceFromEdge / EDGE_THRESHOLD, 1);
    // Use smoother easing function with faster acceleration
    const easedDistance = normalizedDistance * normalizedDistance * (3 - 2 * normalizedDistance);
    // Apply power curve for faster response near edges
    const speed = Math.pow(easedDistance, 0.8) * MAX_SCROLL_SPEED * scrollDirection;

    return speed;
  }, [isHorizontal, EDGE_THRESHOLD, MAX_SCROLL_SPEED]);

  const startAutoScroll = useCallback((speed) => {
    const container = containerRef.current;
    if (!container) return;
    
    if (scrollAnimationRef.current) {
      scrollSpeedRef.current = speed;
      return;
    }
    
    scrollSpeedRef.current = speed;
    lastScrollTimeRef.current = performance.now();
    
    const scroll = (currentTime) => {
      const container = containerRef.current;
      if (!container || Math.abs(scrollSpeedRef.current) < 0.1) {
        stopAutoScroll();
        return;
      }

      const deltaTime = Math.max(currentTime - lastScrollTimeRef.current, 0);
      lastScrollTimeRef.current = currentTime;
      
      // Use fixed timestep for consistent scrolling
      const fixedDelta = 16.67; // 60fps
      const normalizedSpeed = scrollSpeedRef.current * (deltaTime / fixedDelta);

      if (isHorizontal) {
        const maxScroll = container.scrollWidth - container.clientWidth;
        const newScrollLeft = Math.max(0, Math.min(maxScroll, container.scrollLeft + normalizedSpeed));
        container.scrollLeft = newScrollLeft;
        
        // Stop if at boundaries
        if ((newScrollLeft <= 0 && scrollSpeedRef.current < 0) || 
            (newScrollLeft >= maxScroll && scrollSpeedRef.current > 0)) {
          stopAutoScroll();
          return;
        }
      } else {
        const maxScroll = container.scrollHeight - container.clientHeight;
        const newScrollTop = Math.max(0, Math.min(maxScroll, container.scrollTop + normalizedSpeed));
        container.scrollTop = newScrollTop;
        
        // Stop if at boundaries
        if ((newScrollTop <= 0 && scrollSpeedRef.current < 0) || 
            (newScrollTop >= maxScroll && scrollSpeedRef.current > 0)) {
          stopAutoScroll();
          return;
        }
      }

      // Smooth deceleration
      scrollSpeedRef.current *= SCROLL_DECELERATION;

      scrollAnimationRef.current = requestAnimationFrame(scroll);
    };

    scrollAnimationRef.current = requestAnimationFrame(scroll);
  }, [isHorizontal, SCROLL_DECELERATION, stopAutoScroll]);

  const handleAutoScroll = useCallback((clientX, clientY) => {
    const now = performance.now();
    
    // Throttle auto-scroll calculations to reduce overhead
    if (now - lastAutoScrollCheckRef.current < AUTO_SCROLL_THROTTLE) {
      return;
    }
    lastAutoScrollCheckRef.current = now;
    
    // Cache position to avoid repeated calculations
    currentPositionRef.current = { x: clientX, y: clientY };
    
    const speed = calculateScrollSpeed(clientX, clientY);
    
    if (Math.abs(speed) < 0.1) {
      stopAutoScroll();
    } else {
      if (scrollAnimationRef.current) {
        // Smoothly interpolate to new speed to avoid jitter
        scrollSpeedRef.current = scrollSpeedRef.current * 0.7 + speed * 0.3;
      } else {
        startAutoScroll(speed);
      }
    }
  }, [calculateScrollSpeed, startAutoScroll, stopAutoScroll, AUTO_SCROLL_THROTTLE]);

  // Cleanup auto-scroll on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  // Drag handlers - defined after auto-scroll functions
  const handleDragEnd = (e) => {
    if (e.target) {
      e.target.style.opacity = '1';
    }
    stopAutoScroll();
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Handle auto-scroll for mouse drag
    if (draggedIndex !== null) {
      handleAutoScroll(e.clientX, e.clientY);
      
      if (draggedIndex !== index) {
        setDragOverIndex(index);
      }
    }
    
    // Stop event propagation to prevent container handler from firing
    e.stopPropagation();
  }, [draggedIndex, handleAutoScroll]);

  const handleDragLeave = () => {
    setDragOverIndex(null);
    stopAutoScroll();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    stopAutoScroll();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex && onSlideReorder) {
      onSlideReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  // Check if a slide is draggable - only auto-generated leaderboards are not draggable
  const isSlideDraggable = useCallback((slide) => {
    // Auto-generated leaderboard slides are not draggable
    if (slide.type === 'leaderboard' && slide.leaderboardSettings?.isAutoGenerated) {
      return false;
    }
    
    // All other slides are draggable if there's more than one slide
    return slides.length > 1;
  }, [slides]);

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = useCallback((e, index) => {
    const slide = slides[index];
    if (!isSlideDraggable(slide)) {
      return;
    }

    // Don't prevent default initially - only prevent if user actually drags
    // This allows click events to fire for taps
    
    const touch = e.touches[0];
    const element = e.currentTarget;
    
    touchDragStateRef.current = {
      isActive: true,
      startIndex: index,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      draggedElement: element,
      hasMoved: false, // Track if user actually dragged
      startTime: Date.now(), // Track when touch started
    };

    setTouchDragActive(true);
    setDraggedIndex(index);
    setIsDragging(true);
    
    // Don't modify element styles initially - only if user drags
    // This allows click to work normally for taps
  }, [slides, isSlideDraggable]);

  // Attach non-passive touchstart listeners to slide elements
  useEffect(() => {
    const cleanupFunctions = [];
    
    itemRefs.current.forEach((element, index) => {
      if (element) {
        // Always attach touch handlers for all slides
        const touchStartHandler = (e) => {
          // Only handle drag for draggable slides
          if (slides.length > 1 && !(slides[index]?.type === 'leaderboard' && slides[index]?.leaderboardSettings?.isAutoGenerated)) {
            handleTouchStart(e, index);
          } else {
            // For non-draggable slides (single slide or leaderboard), just select on tap
            e.preventDefault();
            if (onSlideSelect) {
              onSlideSelect(index);
            }
          }
        };
        element.addEventListener('touchstart', touchStartHandler, { passive: false });
        cleanupFunctions.push(() => {
          element.removeEventListener('touchstart', touchStartHandler);
        });
      }
    });
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [slides, handleTouchStart, onSlideSelect]);

  const handleTouchMove = useCallback((e) => {
    const dragState = touchDragStateRef.current;
    if (!dragState.isActive) return;

    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    
    // Check if user has moved enough to consider it a drag (not a tap)
    const deltaX = Math.abs(touchX - dragState.startX);
    const deltaY = Math.abs(touchY - dragState.startY);
    const DRAG_THRESHOLD = 10; // pixels
    
    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
      // User is dragging - now prevent default and add visual feedback
      if (!dragState.hasMoved) {
        dragState.hasMoved = true;
        e.preventDefault();
        
        // Add visual feedback only when dragging starts
        if (dragState.draggedElement) {
          dragState.draggedElement.style.opacity = '0.7';
          dragState.draggedElement.style.transform = 'scale(1.1)';
          dragState.draggedElement.style.zIndex = '1000';
          dragState.draggedElement.style.willChange = 'transform';
          dragState.draggedElement.style.pointerEvents = 'none';
        }
      } else {
        e.preventDefault();
      }
    }
    
    // Update ref immediately for performance
    dragState.currentX = touchX;
    dragState.currentY = touchY;

    // Update dragged element position directly (no state update needed)
    if (dragState.draggedElement) {
      const deltaX = touchX - dragState.startX;
      const deltaY = touchY - dragState.startY;
      
      // Use transform3d for hardware acceleration
      dragState.draggedElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.1)`;
    }

    // Calculate drag over index - check all items for accurate detection
    let newDragOverIndex = null;
    const startIdx = dragState.startIndex;
    
    // Check all items to find the correct drop position
    for (let idx = 0; idx < itemRefs.current.length; idx++) {
      const ref = itemRefs.current[idx];
      if (ref && idx !== startIdx) {
        const rect = ref.getBoundingClientRect();
        if (isHorizontal) {
          // Horizontal layout - check if touch is over this slide
          if (touchX >= rect.left && touchX <= rect.right) {
            const centerX = rect.left + rect.width / 2;
            // Determine if we should insert before or after this slide
            newDragOverIndex = touchX < centerX ? idx : idx + 1;
            break;
          }
        } else {
          // Vertical layout - check if touch is over this slide
          if (touchY >= rect.top && touchY <= rect.bottom) {
            const centerY = rect.top + rect.height / 2;
            // Determine if we should insert before or after this slide
            newDragOverIndex = touchY < centerY ? idx : idx + 1;
            break;
          }
        }
      }
    }

    // If no slide found, check if we're at the beginning or end
    if (newDragOverIndex === null) {
      // Check if we're before the first slide
      if (itemRefs.current[0]) {
        const firstRect = itemRefs.current[0].getBoundingClientRect();
        if (isHorizontal && touchX < firstRect.left) {
          newDragOverIndex = 0;
        } else if (!isHorizontal && touchY < firstRect.top) {
          newDragOverIndex = 0;
        }
      }
      
      // Check if we're after the last slide
      if (newDragOverIndex === null && itemRefs.current[itemRefs.current.length - 1]) {
        const lastRect = itemRefs.current[itemRefs.current.length - 1].getBoundingClientRect();
        if (isHorizontal && touchX > lastRect.right) {
          newDragOverIndex = itemRefs.current.length;
        } else if (!isHorizontal && touchY > lastRect.bottom) {
          newDragOverIndex = itemRefs.current.length;
        }
      }
    }

    // Adjust for insertion point - if dragging forward, subtract 1
    if (newDragOverIndex !== null && newDragOverIndex > startIdx) {
      newDragOverIndex -= 1;
    }

    // Update drag over index if it changed
    if (newDragOverIndex !== null && newDragOverIndex !== startIdx && newDragOverIndex >= 0 && newDragOverIndex < itemRefs.current.length) {
      setDragOverIndex(newDragOverIndex);
    } else if (newDragOverIndex === null || newDragOverIndex === startIdx) {
      setDragOverIndex(null);
    }
    
    // Handle auto-scroll
    handleAutoScroll(touchX, touchY);
  }, [isHorizontal, handleAutoScroll]);

  const handleTouchEnd = useCallback((e) => {
    const dragState = touchDragStateRef.current;
    if (!dragState.isActive) return;

    stopAutoScroll();

    // Get current drag over index from state
    const currentDragOverIndex = dragOverIndex;
    const hasMoved = dragState.hasMoved;
    const startIndex = dragState.startIndex;

    // Reset dragged element styles
    if (dragState.draggedElement && hasMoved) {
      dragState.draggedElement.style.opacity = '';
      dragState.draggedElement.style.transform = '';
      dragState.draggedElement.style.zIndex = '';
      dragState.draggedElement.style.willChange = '';
      dragState.draggedElement.style.pointerEvents = '';
    }

    // Perform reorder if we have a valid drop target and user actually dragged
    if (hasMoved && currentDragOverIndex !== null && 
        currentDragOverIndex !== startIndex && 
        currentDragOverIndex >= 0 && 
        currentDragOverIndex < itemRefs.current.length &&
        onSlideReorder) {
      onSlideReorder(startIndex, currentDragOverIndex);
    } else if (!hasMoved && startIndex !== null) {
      // If user didn't drag, treat it as a tap/click - select the slide immediately
      // Prevent default to avoid double-triggering
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      // Directly call onSlideSelect - don't wait for state reset
      if (onSlideSelect) {
        onSlideSelect(startIndex);
      }
    }

    // Reset state immediately
    touchDragStateRef.current = {
      isActive: false,
      startIndex: null,
      startX: null,
      startY: null,
      currentX: null,
      currentY: null,
      draggedElement: null,
      hasMoved: false,
      startTime: null,
    };
    
    // Use requestAnimationFrame to ensure state updates happen after the selection
    requestAnimationFrame(() => {
      setTouchDragActive(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setIsDragging(false);
    });
  }, [dragOverIndex, onSlideReorder, onSlideSelect, stopAutoScroll]);

  const handleTouchCancel = useCallback(() => {
    const dragState = touchDragStateRef.current;
    stopAutoScroll();
    
    if (dragState.draggedElement) {
      dragState.draggedElement.style.opacity = '';
      dragState.draggedElement.style.transform = '';
      dragState.draggedElement.style.zIndex = '';
    }
    touchDragStateRef.current = {
      isActive: false,
      startIndex: null,
      startX: null,
      startY: null,
      currentX: null,
      currentY: null,
      draggedElement: null,
    };
    setTouchDragActive(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  }, [stopAutoScroll]);

  // Add global touch move and end listeners when dragging
  useEffect(() => {
    if (!touchDragActive) return;

    const touchMoveHandler = (e) => {
      handleTouchMove(e);
    };
    const touchEndHandler = (e) => handleTouchEnd(e);
    const touchCancelHandler = () => handleTouchCancel();
    
    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('touchend', touchEndHandler, { passive: false });
    document.addEventListener('touchcancel', touchCancelHandler);
    
    return () => {
      document.removeEventListener('touchmove', touchMoveHandler);
      document.removeEventListener('touchend', touchEndHandler);
      document.removeEventListener('touchcancel', touchCancelHandler);
    };
  }, [touchDragActive, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Horizontal layout for mobile/tablet
  if (isHorizontal) {
    return (
      <div className="w-full bg-[#121212] border-t border-[#2A2A2A] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div 
          className="flex items-center gap-3 px-4 py-3 overflow-x-auto scrollbar-hide" 
          ref={containerRef}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedIndex !== null) {
              handleAutoScroll(e.clientX, e.clientY);
            }
          }}
          onDragLeave={(e) => {
            // Only stop scroll if we're actually leaving the container
            if (!e.currentTarget.contains(e.relatedTarget)) {
              stopAutoScroll();
            }
          }}
        >
          {/* New Slide Button - Fixed on left */}
          <button
            onClick={onNewSlideClick}
            className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-20 h-20 rounded-xl transition-all touch-manipulation ${
              showNewSlideDropdown
                ? 'bg-gradient-to-br from-[#388E3C] to-[#2E7D32] text-white shadow-[0_8px_20px_rgba(56,142,60,0.4)] scale-105'
                : 'bg-[#1F1F1F] border-2 border-dashed border-[#388E3C] text-[#4CAF50] hover:bg-[#252525] hover:border-[#4CAF50] active:scale-95'
            }`}
          >
            {showNewSlideDropdown ? (
              <>
                <X className="h-6 w-6" />
                <span className="text-xs font-semibold">{t('presentation.new_slide_cancel')}</span>
              </>
            ) : (
              <>
                <Plus className="h-6 w-6" />
                <span className="text-xs font-semibold">{t('presentation.new_slide')}</span>
              </>
            )}
          </button>

          {/* Slides List - Horizontal Scroll */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                draggable={isSlideDraggable(slide)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onClick={(e) => {
                  // Only handle click if not dragging and touch wasn't used
                  // On touch devices, handleTouchEnd will handle the selection
                  if (!isDragging && !touchDragActive) {
                    e.stopPropagation();
                    onSlideSelect(index);
                  }
                }}
                className={`relative group flex-shrink-0 cursor-move rounded-xl border-2 transition-all touch-manipulation ${
                  draggedIndex === index
                    ? 'opacity-50 scale-95'
                    : dragOverIndex === index
                    ? 'border-[#4CAF50] scale-110'
                    : currentSlideIndex === index
                    ? 'border-[#4CAF50] bg-[#1F1F1F] shadow-[0_0_16px_rgba(76,175,80,0.5)] scale-105'
                    : 'border-[#2A2A2A] bg-[#181818] hover:border-[#3A3A3A] active:scale-95'
                }`}
                style={{ 
                  width: '130px', 
                  height: '80px',
                  transition: touchDragActive && touchDragStateRef.current.startIndex === index ? 'none' : 'all 0.2s'
                }}
              >
                {/* Drag Handle - Only show for draggable slides */}
                {isSlideDraggable(slide) && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-[#2A2A2A] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#6C6C6C]" />
                  </div>
                )}
                {/* Slide Number Badge */}
                <div className={`absolute -top-2 -left-2 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#388E3C] to-[#2E7D32] text-white text-xs sm:text-sm font-bold rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(56,142,60,0.5)] ${
                  currentSlideIndex === index ? 'ring-2 ring-[#4CAF50] ring-offset-2 ring-offset-[#121212]' : ''
                }`}>
                  {index + 1}
                </div>

                {/* Slide Preview */}
                <div className="w-full h-full rounded-lg overflow-hidden border border-[#2A2A2A]">
                  {renderSlidePreview(slide)}
                </div>

                {/* Active Indicator */}
                {currentSlideIndex === index && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#4CAF50] rounded-full"></div>
                )}

                {/* Edit Button */}
                {onEditSlide && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSlide(index);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 bg-[#388E3C] rounded-full shadow-lg hover:bg-[#4CAF50] transition-all z-20 touch-manipulation"
                    title="Edit slide"
                  >
                    <Settings className="h-3.5 w-3.5 text-white" />
                  </button>
                )}

                {/* Delete Button - Only show for deletable slides */}
                {slides.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSlide(index);
                    }}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-[#EF5350] rounded-full shadow-lg hover:bg-[#E53935] transition-all z-20 touch-manipulation"
                    title="Delete slide"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                )}

              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vertical layout for desktop
  return (
    <aside className="w-full sm:w-56 lg:w-44 bg-[#121212] border-r border-[#2A2A2A] flex flex-col min-h-0 h-full">
      {/* New Slide Button - Sticky at top */}
      <div className="sticky top-0 z-10 bg-[#121212] p-3 border-b border-[#2A2A2A]">
        <button
          onClick={onNewSlideClick}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
            showNewSlideDropdown
              ? 'bg-[#388E3C] text-white shadow-[0_10px_25px_rgba(56,142,60,0.35)]'
              : 'bg-[#2E7D32] text-white hover:bg-[#388E3C] shadow-[0_4px_14px_rgba(56,142,60,0.25)]'
          }`}
        >
          {showNewSlideDropdown ? (
            <>
              <X className="h-4 w-4" />
              {t('presentation.new_slide_cancel')}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t('presentation.new_slide')}
            </>
          )}
        </button>
      </div>

      {/* Slides List */}
      <div 
        className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
        ref={containerRef}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedIndex !== null) {
            handleAutoScroll(e.clientX, e.clientY);
          }
        }}
        onDragLeave={(e) => {
          // Only stop scroll if we're actually leaving the container
          if (!e.currentTarget.contains(e.relatedTarget)) {
            stopAutoScroll();
          }
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            draggable={isSlideDraggable(slide)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onTouchStart={(e) => {
              if (isSlideDraggable(slide)) {
                handleTouchStart(e, index);
              } else {
                e.preventDefault();
              }
            }}
            onClick={() => {
              if (!isDragging && !touchDragActive) {
                onSlideSelect(index);
              }
            }}
            className={`relative group ${
              isSlideDraggable(slide) 
                ? 'cursor-move' 
                : 'cursor-pointer'
            } rounded-lg border transition-all ${
              draggedIndex === index
                ? 'opacity-50 scale-95'
                : dragOverIndex === index
                ? 'border-[#4CAF50] scale-105 bg-[#252525]'
                : currentSlideIndex === index
                ? 'border-[#4CAF50] bg-[#1F1F1F] shadow-[0_0_12px_rgba(76,175,80,0.35)]'
                : 'border-[#2A2A2A] bg-[#181818] hover:border-[#3A3A3A]'
            }`}
            style={{
              transition: touchDragActive && touchDragStateRef.current.startIndex === index ? 'none' : 'all 0.2s'
            }}
          >
            {/* Drag Handle - Only show for draggable slides */}
            {isSlideDraggable(slide) && (
              <div className="absolute top-1 left-1 w-5 h-5 bg-[#2A2A2A] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3.5 w-3.5 text-[#6C6C6C]" />
              </div>
            )}
            {/* Slide Number Badge */}
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-[#388E3C] text-white text-xs font-semibold rounded-full flex items-center justify-center shadow-[0_2px_6px_rgba(56,142,60,0.4)]">
              {index + 1}
            </div>

            {/* Slide Preview */}
            <div className="p-2 pt-3">
              <div className="aspect-video bg-[#1F1F1F] rounded overflow-hidden border border-[#2A2A2A]">
                {renderSlidePreview(slide)}
              </div>
            </div>

            {/* Delete Button (shows on hover) */}
            {slides.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSlide(index);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-[#242424] rounded-full shadow-md hover:bg-[#2F2F2F] transition-all"
                title="Delete slide"
              >
                <X className="h-3 w-3 text-[#EF5350]" />
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SlideBar;
