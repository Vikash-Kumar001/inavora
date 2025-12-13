import { useState } from 'react';
import { Send } from 'lucide-react';

const ParticipantGuessView = ({
  slide,
  onSubmit,
  hasSubmitted,
  guessDistribution = {},
  totalResponses = 0
}) => {
  const minValue = slide?.guessNumberSettings?.minValue ?? 1;
  const maxValue = slide?.guessNumberSettings?.maxValue ?? 10;
  const [guess, setGuess] = useState(minValue);

  const handleSubmit = () => {
    if (onSubmit && !hasSubmitted) {
      onSubmit(guess);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-[#E0E0E0] text-center leading-tight">
          {slide?.question || 'Guess the Number'}
        </h2>
        <p className="text-center text-[#B0B0B0] mt-2">
          Use the slider to make your guess
        </p>
      </div>

      {!hasSubmitted ? (
        <div className="bg-[#1F1F1F] rounded-2xl shadow-lg border border-[#2A2A2A] p-8 space-y-6">
          {/* Current Value Display */}
          <div className="text-center">
            <div className="inline-block px-8 py-4 bg-[#1D2A20] rounded-2xl">
              <p className="text-6xl font-bold text-[#4CAF50]">{guess}</p>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-4">
            <input
              type="range"
              min={minValue}
              max={maxValue}
              value={guess}
              onChange={(e) => setGuess(Number(e.target.value))}
              className="w-full h-3 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${((guess - minValue) / (maxValue - minValue)) * 100}%, #2A2A2A ${((guess - minValue) / (maxValue - minValue)) * 100}%, #2A2A2A 100%)`
              }}
            />
            <div className="flex justify-between text-sm text-[#6C6C6C]">
              <span>{minValue}</span>
              <span>{maxValue}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#388E3C] to-[#2E7D32] hover:from-[#4CAF50] hover:to-[#388E3C] text-white rounded-xl font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-[#4CAF50]/20"
          >
            <Send className="h-5 w-5" />
            Submit Guess
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Submission confirmation */}
          <div className="bg-[#1D2A20] border border-[#4CAF50]/30 rounded-2xl p-8 text-center">
            <div className="inline-block p-4 bg-[#2E7D32]/20 rounded-full mb-4">
              <svg className="h-12 w-12 text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-[#E0E0E0] mb-2">Guess Submitted!</h3>
            <p className="text-[#4CAF50]">You guessed: <span className="font-bold text-2xl">{guess}</span></p>
            <p className="text-sm text-[#B0B0B0] mt-2">Viewing live distribution...</p>
          </div>

          {/* Live Distribution */}
          {totalResponses > 0 && Object.keys(guessDistribution).length > 0 && (
            <div className="bg-[#1F1F1F] rounded-2xl border border-[#2A2A2A] shadow-xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-semibold text-[#E0E0E0]">Live Distribution</h3>
                <div className="flex items-center gap-2 text-sm text-[#9E9E9E]">
                  <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse"></div>
                  <span>{totalResponses} {totalResponses === 1 ? 'guess' : 'guesses'}</span>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(guessDistribution)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([value, count]) => {
                    const maxCount = Math.max(...Object.values(guessDistribution), 1);
                    const percentage = (count / maxCount) * 100;
                    const isYourGuess = Number(value) === guess;
                    
                    return (
                      <div key={value} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isYourGuess ? 'text-[#4CAF50]' : 'text-[#E0E0E0]'}`}>
                            {value} {isYourGuess && '← Your guess'}
                          </span>
                          <span className="text-sm font-bold text-[#E0E0E0]">{count}</span>
                        </div>
                        <div className="h-6 bg-[#2A2A2A] rounded-lg overflow-hidden border border-[#2F2F2F]">
                          <div
                            className={`h-full transition-all duration-500 flex items-center justify-end pr-2 ${
                              isYourGuess
                                ? 'bg-gradient-to-r from-[#4CAF50] to-[#388E3C]'
                                : 'bg-gradient-to-r from-[#388E3C]/60 to-[#4CAF50]/60'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: #4CAF50;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #4CAF50;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ParticipantGuessView;
