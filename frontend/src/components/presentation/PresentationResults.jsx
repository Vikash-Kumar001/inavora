import { useState, useEffect, useRef } from 'react';
import { LoaderCircle, Download } from 'lucide-react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../../utils/config';
import * as presentationService from '../../services/presentationService';
import { formatSlideDataForExport, exportAllSlidesToPDF } from '../../utils/exportUtils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Import new Result Components
import MCQResult from '../interactions/Results/MCQResult';
import WordCloudResult from '../interactions/Results/WordCloudResult';
import OpenEndedResult from '../interactions/Results/OpenEndedResult';
import ScalesResult from '../interactions/Results/ScalesResult';
import RankingResult from '../interactions/Results/RankingResult';
import HundredPointsResult from '../interactions/Results/HundredPointsResult';
import QuizResult from '../interactions/Results/QuizResult';
import LeaderboardResult from '../interactions/Results/LeaderboardResult';
import QnaResult from '../interactions/Results/QnaResult';
import GuessNumberResult from '../interactions/Results/GuessNumberResult';
import GridResult from '../interactions/Results/GridResult';
import PinOnImageResult from '../interactions/Results/PinOnImageResult';
import PickAnswerResult from '../interactions/Results/PickAnswerResult';
import TypeAnswerResult from '../interactions/Results/TypeAnswerResult';
import MiroResult from '../interactions/Results/MiroResult';
import PowerPointResult from '../interactions/Results/PowerPointResult';
import GoogleSlidesResult from '../interactions/Results/GoogleSlidesResult';
import UploadResult from '../interactions/Results/UploadResult';
import InstructionResult from '../interactions/Results/InstructionResult';
import TextResult from '../interactions/Results/TextResult';
import ImageResult from '../interactions/Results/ImageResult';
import VideoResult from '../interactions/Results/VideoResult';

const PresentationResults = ({ slides, presentationId }) => {
    const [results, setResults] = useState(null);
    const [presentation, setPresentation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const resultsRef = useRef(null);
    const socketRef = useRef(null);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            if (!presentationId) return;

            setIsLoading(true);
            try {
                // Fetch both results and presentation data
                const [resultsData, presentationData] = await Promise.all([
                    presentationService.getPresentationResults(presentationId),
                    presentationService.getPresentationById(presentationId)
                ]);
                
                setResults(resultsData.results || resultsData);
                setPresentation(presentationData.presentation);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load results. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [presentationId]);

    // Setup WebSocket connection for real-time updates
    useEffect(() => {
        if (!presentationId) return;

        // Initialize socket connection
        const socket = io(getSocketUrl());
        socketRef.current = socket;

        // Join presentation room to receive updates
        const joinRoom = () => {
            socket.emit('join-presentation-results', { presentationId });
        };

        // Join immediately if already connected, otherwise wait for connect event
        if (socket.connected) {
            joinRoom();
        } else {
            socket.on('connect', joinRoom);
        }

        // Handle response updates
        const handleResponseUpdated = (data) => {
            if (!data || !data.slideId) return;

            setResults(prevResults => {
                if (!prevResults) return prevResults;

                const slideId = data.slideId.toString();
                const updatedResults = { ...prevResults };

                // Update or create result entry for this slide
                if (updatedResults[slideId]) {
                    // Merge with existing data
                    updatedResults[slideId] = {
                        ...updatedResults[slideId],
                        ...data,
                        totalResponses: data.totalResponses !== undefined 
                            ? data.totalResponses 
                            : updatedResults[slideId].totalResponses
                    };
                } else {
                    // Create new entry if it doesn't exist
                    updatedResults[slideId] = {
                        slideId: slideId,
                        type: slides?.find(s => (s.id || s._id)?.toString() === slideId)?.type || 'unknown',
                        totalResponses: data.totalResponses || 0,
                        ...data
                    };
                }

                return updatedResults;
            });
        };

        // Handle slide changes (refresh all results)
        const handleSlideChanged = async () => {
            // Refetch all results when slide changes
            try {
                const resultsData = await presentationService.getPresentationResults(presentationId);
                setResults(resultsData.results || resultsData);
            } catch (err) {
                console.error('Failed to refresh results:', err);
            }
        };

        // Listen for events
        socket.on('response-updated', handleResponseUpdated);
        socket.on('slide-changed', handleSlideChanged);
        socket.on('connect', () => {
            console.log('Connected to presentation results socket');
        });
        socket.on('disconnect', () => {
            console.log('Disconnected from presentation results socket');
        });
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // Cleanup on unmount
        return () => {
            socket.off('response-updated', handleResponseUpdated);
            socket.off('slide-changed', handleSlideChanged);
            socket.off('connect');
            socket.off('disconnect');
            socket.off('error');
            socket.disconnect();
        };
    }, [presentationId, slides]);

    const handleExportData = async (format) => {
        if (!presentationId || !slides || slides.length === 0) {
            toast.error('No presentation or slides available');
            return;
        }
        
        setIsExporting(true);
        try {
            // Fetch all slide responses
            const allSlideData = [];
            
            for (const slide of slides) {
                try {
                    const slideId = slide.id || slide._id;
                    if (!slideId) continue;
                    
                    const response = await presentationService.getSlideResponses(presentationId, slideId);
                    
                    if (response && response.success && response.slide && response.responses) {
                        const formattedData = formatSlideDataForExport(
                            response.slide,
                            response.responses,
                            response.aggregatedData
                        );
                        allSlideData.push({
                            slide,
                            formattedData,
                            slideIndex: slides.indexOf(slide)
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching data for slide ${slide.id || slide._id}:`, err);
                    // Continue with other slides even if one fails
                }
            }
            
            if (allSlideData.length === 0) {
                toast.error('No data available to export');
                setIsExporting(false);
                return;
            }
            
            // Generate filename
            const sanitizedTitle = (presentation?.title || 'Presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${sanitizedTitle}_results_${dateStr}`;
            
            if (format === 'csv') {
                // Export all slides to a single CSV file
                exportAllSlidesToCSV(allSlideData, filename);
            } else if (format === 'excel') {
                // Export all slides to a multi-sheet Excel file
                exportAllSlidesToExcel(allSlideData, filename);
            }
            
            toast.success(`Exported ${allSlideData.length} slide(s) as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export results');
        } finally {
            setIsExporting(false);
        }
    };
    
    // Export all slides to CSV
    const exportAllSlidesToCSV = (allSlideData, filename) => {
        let csvContent = `"${presentation?.title || 'Presentation Results'}"\n`;
        csvContent += `"Exported: ${new Date().toLocaleString()}"\n`;
        csvContent += `"Total Slides: ${allSlideData.length}"\n\n`;
        
        allSlideData.forEach(({ slide, formattedData, slideIndex }) => {
            const { question, timestamp, summary, detailed, metadata } = formattedData;
            
            csvContent += `"${'='.repeat(80)}"\n`;
            csvContent += `"Slide ${slideIndex + 1}: ${question}"\n`;
            csvContent += `"Type: ${formattedData.slideType}"\n`;
            csvContent += `"Total Responses: ${metadata.totalResponses}"\n`;
            csvContent += `"${'='.repeat(80)}"\n\n`;
            
            // Summary section
            if (summary.length > 0) {
                csvContent += '"SUMMARY"\n';
                const summaryHeaders = Object.keys(summary[0]);
                csvContent += summaryHeaders.map(h => `"${h}"`).join(',') + '\n';
                summary.forEach(row => {
                    csvContent += summaryHeaders.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
                });
                csvContent += '\n';
            }
            
            // Detailed section
            if (detailed.length > 0) {
                csvContent += '"DETAILED RESPONSES"\n';
                const detailedHeaders = Object.keys(detailed[0]);
                csvContent += detailedHeaders.map(h => `"${h}"`).join(',') + '\n';
                detailed.forEach(row => {
                    csvContent += detailedHeaders.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
                });
            }
            
            csvContent += '\n\n';
        });
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Export all slides to Excel
    const exportAllSlidesToExcel = (allSlideData, filename) => {
        const wb = XLSX.utils.book_new();
        
        // Overview sheet
        const overviewData = [
            ['Presentation Title', presentation?.title || 'Untitled Presentation'],
            ['Exported', new Date().toLocaleString()],
            ['Total Slides', allSlideData.length],
            [''],
            ['Slide', 'Question', 'Type', 'Total Responses']
        ];
        
        allSlideData.forEach(({ slide, formattedData, slideIndex }) => {
            overviewData.push([
                slideIndex + 1,
                formattedData.question || 'N/A',
                formattedData.slideType || 'unknown',
                formattedData.metadata?.totalResponses || 0
            ]);
        });
        
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');
        
        // Create a sheet for each slide
        allSlideData.forEach(({ slide, formattedData, slideIndex }) => {
            const { question, summary, detailed, metadata } = formattedData;
            const sheetName = `Slide ${slideIndex + 1}`.substring(0, 31); // Excel sheet name limit
            
            // Metadata
            const metadataData = [
                ['Question', question],
                ['Type', formattedData.slideType],
                ['Total Responses', metadata.totalResponses],
                ['']
            ];
            
            // Summary
            if (summary.length > 0) {
                metadataData.push(['SUMMARY']);
                const summaryHeaders = Object.keys(summary[0]);
                metadataData.push(summaryHeaders);
                summary.forEach(row => {
                    metadataData.push(summaryHeaders.map(h => row[h] || ''));
                });
                metadataData.push(['']);
            }
            
            // Detailed
            if (detailed.length > 0) {
                metadataData.push(['DETAILED RESPONSES']);
                const detailedHeaders = Object.keys(detailed[0]);
                metadataData.push(detailedHeaders);
                detailed.forEach(row => {
                    metadataData.push(detailedHeaders.map(h => row[h] || ''));
                });
            }
            
            const ws = XLSX.utils.aoa_to_sheet(metadataData);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const handleExportToPDF = async () => {
        if (!presentationId || !slides || slides.length === 0) {
            toast.error('No presentation or slides available');
            return;
        }
        
        setIsExporting(true);
        try {
            // Fetch all slide responses
            const allSlideData = [];
            
            for (const slide of slides) {
                try {
                    const slideId = slide.id || slide._id;
                    if (!slideId) continue;
                    
                    const response = await presentationService.getSlideResponses(presentationId, slideId);
                    
                    if (response && response.success && response.slide && response.responses) {
                        const formattedData = formatSlideDataForExport(
                            response.slide,
                            response.responses,
                            response.aggregatedData
                        );
                        allSlideData.push({
                            slide: response.slide,
                            formattedData,
                            slideIndex: slides.indexOf(slide)
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching data for slide ${slide.id || slide._id}:`, err);
                    // Continue with other slides even if one fails
                }
            }
            
            if (allSlideData.length === 0) {
                toast.error('No data available to export');
                setIsExporting(false);
                return;
            }
            
            // Generate filename
            const sanitizedTitle = (presentation?.title || 'Presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${sanitizedTitle}_results_${dateStr}`;
            
            // Export all slides to PDF
            exportAllSlidesToPDF(allSlideData, presentation?.title || 'Presentation Results', filename);
            
            toast.success(`Exported ${allSlideData.length} slide(s) as PDF`);
        } catch (error) {
            console.error('PDF export error:', error);
            toast.error('Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 bg-[#1A1A1A] p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto h-full flex items-center justify-center">
                    <LoaderCircle className="animate-spin text-[#4CAF50]" size={40} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 bg-[#1A1A1A] p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto h-full flex items-center justify-center">
                    <div className="text-center p-4 text-[#EF5350] text-sm sm:text-base">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!slides || slides.length === 0) {
        return (
            <div className="flex-1 bg-[#1A1A1A] p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto h-full flex items-center justify-center">
                    <div className="text-center p-4 text-[#B0B0B0] text-sm sm:text-base">
                        No slides in this presentation.
                    </div>
                </div>
            </div>
        );
    }

    const getSlideResults = (slide) => {
        if (!results) return {};
        return results[slide.id] || results[slide._id] || {};
    };

    const renderSlideResult = (slide) => {
        const slideResults = getSlideResults(slide);

        switch (slide.type) {
            case 'multiple_choice':
                return <MCQResult slide={slide} data={slideResults} />;
            case 'word_cloud':
                return <WordCloudResult slide={slide} data={slideResults} />;
            case 'open_ended':
                return <OpenEndedResult slide={slide} data={slideResults} />;
            case 'scales':
                return <ScalesResult slide={slide} data={slideResults} />;
            case 'ranking':
                return <RankingResult slide={slide} data={slideResults} />;
            case 'hundred_points':
                return <HundredPointsResult slide={slide} data={slideResults} />;
            case 'quiz':
                return <QuizResult slide={slide} data={slideResults} />;
            case 'leaderboard':
                return <LeaderboardResult slide={slide} data={slideResults} />;
            case 'qna':
                return <QnaResult slide={slide} data={slideResults} />;
            case 'guess_number':
                return <GuessNumberResult slide={slide} data={slideResults} />;
            case '2x2_grid':
                return <GridResult slide={slide} data={slideResults} />;
            case 'pin_on_image':
                return <PinOnImageResult slide={slide} data={slideResults} />;
            case 'pick_answer':
                return <PickAnswerResult slide={slide} data={slideResults} />;
            case 'type_answer':
                return <TypeAnswerResult slide={slide} data={slideResults} />;
            case 'miro':
                return <MiroResult slide={slide} data={slideResults} />;
            case 'powerpoint':
                return <PowerPointResult slide={slide} data={slideResults} />;
            case 'google_slides':
                return <GoogleSlidesResult slide={slide} data={slideResults} />;
            case 'upload':
                return <UploadResult slide={slide} data={slideResults} />;
            case 'instruction':
                return <InstructionResult slide={slide} data={slideResults} presentation={presentation} />;
            case 'text':
                return <TextResult slide={slide} data={slideResults} />;
            case 'image':
                return <ImageResult slide={slide} data={slideResults} />;
            case 'video':
                return <VideoResult slide={slide} data={slideResults} />;
            default:
                return (
                    <div className="text-center text-[#B0B0B0] py-6 sm:py-8 bg-[#1F1F1F] rounded-xl border border-[#2A2A2A]">
                        <p className="mb-2 font-medium text-[#E0E0E0] text-sm sm:text-base">{typeof slide.question === 'string' ? slide.question : (slide.question?.text || 'Untitled Slide')}</p>
                        <p className="text-xs sm:text-sm text-[#6C6C6C]">Results visualization coming soon for {slide.type}.</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex-1 bg-[#1A1A1A] p-4 sm:p-6 md:p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 pb-12 sm:pb-16 md:pb-20">
                <div className="mb-4 sm:mb-6 md:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#E0E0E0] mb-1 sm:mb-2">Presentation Results</h2>
                            <p className="text-sm sm:text-base text-[#B0B0B0]">Overview of all responses collected</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative group">
                                <button
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg hover:shadow-xl"
                                >
                                    <Download className="w-4 h-4" />
                                    {isExporting ? 'Exporting...' : 'Export'}
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                    <button
                                        onClick={handleExportToPDF}
                                        disabled={isExporting}
                                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white disabled:opacity-50"
                                    >
                                        Export as PDF
                                    </button>
                                    <button
                                        onClick={() => handleExportData('csv')}
                                        disabled={isExporting}
                                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white disabled:opacity-50"
                                    >
                                        Export as CSV
                                    </button>
                                    <button
                                        onClick={() => handleExportData('excel')}
                                        disabled={isExporting}
                                        className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white disabled:opacity-50"
                                    >
                                        Export as Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div ref={resultsRef}>
                    {slides.map((slide, index) => (
                        <div key={slide.id || slide._id || index} className="w-full mb-6 sm:mb-8 pdf-slide">
                            <h3 className="text-xl font-semibold text-[#E0E0E0] mb-4 pdf-slide-title">
                                Slide {index + 1}: {typeof slide.question === 'string' ? slide.question : (slide.question?.text || slide.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))}
                            </h3>
                            {renderSlideResult(slide)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PresentationResults;