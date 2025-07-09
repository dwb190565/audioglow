
"use client"

import React from 'react';
import { Play, Pause, Music, Mic, SlidersHorizontal, ChevronLeft, ChevronRight, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ListMusic, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Track } from '@/app/page';
import { Separator } from '@/components/ui/separator';

interface ControlsProps {
  isPlaying: boolean;
  isMic: boolean;
  onPlayPause: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMicClick: () => void;
  onAmpChange: (value: number[]) => void;
  onNextBackgroundChange: () => void;
  onPrevBackgroundChange: () => void;
  amp: number;
  hasAudioSource: boolean;
  nextBackgroundTitle: string;
  prevBackgroundTitle: string;
  isPlaylistOpen: boolean;
  setIsPlaylistOpen: (open: boolean) => void;
  currentTrack: Track | null;
  isLoopingSong: boolean;
  toggleLoopSong: () => void;
  isLoopingPlaylist: boolean;
  toggleLoopPlaylist: () => void;
  isShuffled: boolean;
  toggleShuffle: () => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  volume: number;
  onVolumeChange: (value: number[]) => void;
  formatTime: (seconds: number) => string;
  playbackProgress: { currentTime: number; duration: number };
  onSeek: (value: number[]) => void;
  areControlsVisible: boolean;
  setAreControlsVisible: (open: boolean | ((prev: boolean) => boolean)) => void;
}

const Controls: React.FC<ControlsProps> = (props) => {
  const {
    isPlaying, isMic, onPlayPause, onFileChange, onMicClick, onAmpChange,
    onNextBackgroundChange, onPrevBackgroundChange, amp, hasAudioSource,
    nextBackgroundTitle, prevBackgroundTitle, setIsPlaylistOpen, currentTrack,
    isLoopingSong, toggleLoopSong, isLoopingPlaylist, toggleLoopPlaylist,
    isShuffled, toggleShuffle, onPlayNext, onPlayPrev, volume, onVolumeChange,
    formatTime, playbackProgress, onSeek, areControlsVisible, setAreControlsVisible
  } = props;

  const [isAmpPopoverOpen, setIsAmpPopoverOpen] = React.useState(false);
  const [isVolumePopoverOpen, setIsVolumePopoverOpen] = React.useState(false);
  const ampTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverEnter = (setOpen: React.Dispatch<React.SetStateAction<boolean>>, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }
    setOpen(true);
  };

  const handleHoverLeave = (setOpen: React.Dispatch<React.SetStateAction<boolean>>, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
      timerRef.current = setTimeout(() => {
          setOpen(false);
      }, 200);
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      <div className={cn(
        "w-full max-w-2xl flex flex-col items-center gap-1 transition-opacity duration-300",
        areControlsVisible && currentTrack && !isMic ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
            <div className="w-full flex items-center gap-2">
              <span className="text-xs font-mono w-12 text-right text-white/80">{formatTime(playbackProgress.currentTime)}</span>
              <Slider
                value={[playbackProgress.currentTime]}
                max={playbackProgress.duration || 1}
                step={1}
                onValueChange={onSeek}
                className="w-full"
              />
              <span className="text-xs font-mono w-12 text-white/80">{formatTime(playbackProgress.duration)}</span>
            </div>
            <div className="h-5 w-64 overflow-hidden">
                {currentTrack && !isMic && (
                    <p className="animate-marquee whitespace-nowrap text-sm font-semibold text-center" title={currentTrack.title}>
                      {currentTrack.title}
                    </p>
                )}
            </div>
      </div>

      <div className="relative w-full h-16 flex items-center px-2">
        <div className={cn(
            "absolute inset-0 w-full h-full rounded-full bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            !areControlsVisible && "opacity-0 pointer-events-none"
        )} />

        <div className="relative z-10 w-full flex items-center justify-between gap-1">
            {/* Left Group */}
            <div className="flex items-center gap-1 flex-none">
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={() => setAreControlsVisible(p => !p)} variant="ghost" size="icon" className="h-12 w-12 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5">
                              <defs>
                                  <linearGradient id="omni-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="hsl(var(--accent))" />
                                      <stop offset="100%" stopColor="hsl(var(--primary))" />
                                  </linearGradient>
                              </defs>
                              <circle cx="12" cy="12" r="10" stroke="url(#omni-gradient)" strokeWidth="2.5" />
                          </svg>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent className="w-64">
                    {areControlsVisible ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-center">
                          <p className="font-bold text-lg">AudioGlow</p>
                          <p className="text-sm text-muted-foreground">A WebGL Music Visualizer</p>
                        </div>
                        
                        <p className="text-xs text-muted-foreground text-center">Click icon or press <kbd>H</kbd> to hide.</p>
                        
                        <Separator className="my-1" />
                        <p className="text-xs font-medium text-center text-foreground">Keyboard Shortcuts</p>
                        <div className="text-xs text-muted-foreground grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
                          <span>Play / Pause</span><kbd>Space</kbd>
                          <span>Change Background</span><div className="flex gap-1"><kbd>←</kbd><kbd>→</kbd></div>
                          <span>Prev / Next Track</span><div className="flex items-center gap-1"><span>⌘</span><span>+</span><kbd>←</kbd>/<kbd>→</kbd></div>
                          <span>Toggle Mic</span><kbd>M</kbd>
                          <span>Upload Audio</span><kbd>U</kbd>
                          <span>Adjust Intensity</span><div className="flex gap-1"><kbd>+</kbd><kbd>-</kbd></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 text-center">
                        <p>Show Controls</p>
                        <p className="text-xs text-muted-foreground">Press <kbd>H</kbd></p>
                      </div>
                    )}
                  </TooltipContent>
              </Tooltip>
              <div className={cn("flex items-center transition-opacity duration-300", !areControlsVisible && "opacity-0 pointer-events-none")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onPrevBackgroundChange} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{prevBackgroundTitle}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onNextBackgroundChange} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{nextBackgroundTitle}</p></TooltipContent>
                </Tooltip>
                
                <Popover open={isAmpPopoverOpen} onOpenChange={setIsAmpPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div onMouseEnter={() => handleHoverEnter(setIsAmpPopoverOpen, ampTimerRef)} onMouseLeave={() => handleHoverLeave(setIsAmpPopoverOpen, ampTimerRef)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      onMouseEnter={() => handleHoverEnter(setIsAmpPopoverOpen, ampTimerRef)} 
                      onMouseLeave={() => handleHoverLeave(setIsAmpPopoverOpen, ampTimerRef)} 
                      className="w-auto p-2 bg-background/50 backdrop-blur-sm border-white/20"
                    >
                      <Slider value={[amp]} min={10} max={20} step={1} orientation="vertical" className="h-32" onValueChange={onAmpChange} />
                    </PopoverContent>
                </Popover>

              </div>
            </div>
            
            {/* Center Group */}
            <div className={cn(
              "flex-1 flex items-center justify-center gap-1 transition-opacity duration-300",
              !areControlsVisible && "opacity-0 pointer-events-none"
            )}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={toggleShuffle} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full text-white/90 hover:bg-white/10", isShuffled ? "text-primary" : "")}>
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Shuffle</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onPlayPrev} disabled={!hasAudioSource || isMic} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Previous</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onPlayPause} disabled={!hasAudioSource || isMic} size="icon" variant="ghost" className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20">
                    {isPlaying && !isMic ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6 fill-current" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isPlaying ? 'Pause' : 'Play'}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onPlayNext} disabled={!hasAudioSource || isMic} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Next</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={toggleLoopSong} onContextMenu={(e) => { e.preventDefault(); toggleLoopPlaylist()}} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full text-white/90 hover:bg-white/10", (isLoopingSong || isLoopingPlaylist) ? "text-primary" : "")}>
                    {isLoopingSong ? <Repeat1 className="h-4 w-4"/> : <Repeat className="h-4 w-4"/>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isLoopingSong ? <p>Looping Song</p> : isLoopingPlaylist ? <p>Looping Playlist</p> : <p>Loop Off</p>}
                  <p className="text-xs text-muted-foreground">Right-click for playlist loop</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Right Group */}
            <div className={cn(
              "flex-none flex items-center justify-end gap-2 isolate transition-opacity duration-300",
              !areControlsVisible && "opacity-0 pointer-events-none"
            )}>
              <Popover open={isVolumePopoverOpen} onOpenChange={setIsVolumePopoverOpen}>
                  <PopoverTrigger asChild>
                    <div onMouseEnter={() => handleHoverEnter(setIsVolumePopoverOpen, volumeTimerRef)} onMouseLeave={() => handleHoverLeave(setIsVolumePopoverOpen, volumeTimerRef)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                          <VolumeIcon className="h-4 w-4" />
                        </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent 
                    onMouseEnter={() => handleHoverEnter(setIsVolumePopoverOpen, volumeTimerRef)} 
                    onMouseLeave={() => handleHoverLeave(setIsVolumePopoverOpen, volumeTimerRef)}
                    className="w-auto p-2 bg-background/50 backdrop-blur-sm border-white/20"
                  >
                    <Slider value={[volume]} max={1} step={0.05} onValueChange={onVolumeChange} className="h-32" orientation="vertical" />
                  </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setIsPlaylistOpen(true)} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white">
                    <ListMusic className="h-4 w-4"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Playlist</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <span className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8 rounded-full text-white/90 hover:bg-white/10 hover:text-white inline-flex items-center justify-center")}>
                      <Music className="w-4 w-4" />
                    </span>
                    <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={onFileChange} multiple />
                  </label>
                </TooltipTrigger>
                <TooltipContent><p>Upload Audio</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onMicClick} variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full text-white/90 hover:bg-white/10", isMic && 'bg-accent text-accent-foreground hover:bg-accent/90')}>
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isMic ? 'Disable Mic' : 'Enable Mic'}</p></TooltipContent>
              </Tooltip>
            </div>
        </div>
      </div>
    </>
  );
};

export default Controls;
