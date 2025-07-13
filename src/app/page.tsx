
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Visualizer from '@/components/visualizer';
import Controls from '@/components/controls';
import Playlist from '@/components/playlist';
import SplashScreen from '@/components/splash-screen';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

// Background Components
import AsciiBackground from '@/components/ascii-background';
import GlitchBackground from '@/components/glitch-background';
import TypewriterBackground from '@/components/typewriter-background';
import WaterfallBackground from '@/components/waterfall-background';
import ShardFieldBackground from '@/components/shard-field-background';
import CellularAutomataBackground from '@/components/cellular-automata-background';
import ThermalBackground from '@/components/thermal-background';
import VortexBackground from '@/components/vortex-background';
import HarmonicOscillatorBackground from '@/components/harmonic-oscillator-background';
import PortalBackground from '@/components/portal-background';
import GlyphRainBackground from '@/components/glyph-rain-background';
import CausticsBackground from '@/components/caustics-background';
import RootSystemBackground from '@/components/root-system-background';
import TextEqBackground from '@/components/text-eq-background';
import CharacterFluidBackground from '@/components/character-fluid-background';
import MarqueeBackground from '@/components/marquee-background';
import TelegraphicPulseBackground from '@/components/telegraphic-pulse-background';
import PunchCardBackground from '@/components/punch-card-background';
import OldMonitorBackground from '@/components/old-monitor-background';
import SonogramBackground from '@/components/sonogram-background';
import RetroGridBackground from '@/components/retro-grid-background';
import LcdBleedBackground from '@/components/lcd-bleed-background';

const BACKGROUND_MODES = ['harmonic', 'typewriter', 'ascii', 'waterfall', 'shard', 'automata', 'thermal', 'vortex', 'glitch', 'glyph-rain', 'caustics', 'root-system', 'text-eq', 'character-fluid', 'old-monitor', 'sonogram', 'retro-grid', 'lcd-bleed', 'punch-card', 'telegraphic-pulse', 'marquee', 'portal'] as const;
type BackgroundMode = typeof BACKGROUND_MODES[number];

export type Track = { id: string; file: File; title: string };

const BACKGROUND_TITLES: Record<BackgroundMode, string> = {
    'harmonic': 'Harmonic Oscillator', 'glitch': 'Glitch', 'typewriter': 'Typewriter', 'ascii': 'ASCII', 'waterfall': 'Waterfall', 'shard': 'Shard Field', 'automata': 'Cellular Automata', 'thermal': 'Thermal', 'vortex': 'Vortex', 'portal': 'Portal', 'glyph-rain': 'Glyph Rain', 'caustics': 'Caustics', 'root-system': 'Root System', 'text-eq': 'Text EQ', 'character-fluid': 'Character Fluid', 'lcd-bleed': 'LCD Bleed', 'marquee': 'Marquee', 'telegraphic-pulse': 'Telegraphic Pulse', 'punch-card': 'Punch Card', 'old-monitor': 'Old Monitor', 'sonogram': 'Sonogram Bloom', 'retro-grid': 'Retro Game Grid',
};

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function Home() {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [amp, setAmp] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMic, setIsMic] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('harmonic');
  
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isLoopingSong, setIsLoopingSong] = useState(false);
  const [isLoopingPlaylist, setIsLoopingPlaylist] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Track[]>([]);
  const [volume, setVolume] = useState(1);
  const [playbackProgress, setPlaybackProgress] = useState({ currentTime: 0, duration: 0 });
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isAutoplayScheduled, setIsAutoplayScheduled] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const setupAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      setAnalyser(analyserRef.current);
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
  }, []);

  const cleanupMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (sourceNodeRef.current && sourceNodeRef.current instanceof MediaStreamAudioSourceNode) {
      sourceNodeRef.current.disconnect();
    }

    if (mediaElementSourceRef.current) {
      sourceNodeRef.current = mediaElementSourceRef.current;
      if (analyserRef.current) {
          try {
              sourceNodeRef.current.connect(analyserRef.current);
          } catch(e) {
              console.log("Audio source already connected during mic cleanup.");
          }
      }
    } else {
        sourceNodeRef.current = null;
    }

    setIsMic(false);
  }, []);
  
  const activePlaylist = useMemo(() => {
    return isShuffled ? shuffledPlaylist : playlist;
  }, [isShuffled, playlist, shuffledPlaylist]);

  const currentTrack = currentTrackIndex !== null ? activePlaylist[currentTrackIndex] : null;
  
  const playTrack = useCallback(async (index: number | null) => {
    if (!audioElementRef.current) return;
  
    if (index === null || index < 0 || index >= activePlaylist.length) {
      audioElementRef.current.pause();
      setIsPlaying(false);
      setCurrentTrackIndex(null);
      return;
    }
    
    const track = activePlaylist[index];
    if (!track) return;
    
    // Prevent re-playing the same track from the start if it's already loaded
    if (audioElementRef.current.currentSrc && audioElementRef.current.src.endsWith(track.file.name)) {
        if (audioElementRef.current.paused) {
            try {
                await audioElementRef.current.play();
                setIsPlaying(true);
            } catch (e) {
                 if ((e as DOMException).name !== 'AbortError') {
                    console.error("Error playing audio:", e);
                    setIsPlaying(false);
                }
            }
        }
        return;
    }

    audioElementRef.current.pause();
    if (audioElementRef.current.src) {
      URL.revokeObjectURL(audioElementRef.current.src);
    }
    audioElementRef.current.src = URL.createObjectURL(track.file);
    audioElementRef.current.load();
    
    try {
      await audioElementRef.current.play();
      setCurrentTrackIndex(index);
      setIsPlaying(true);
      setIsMic(false);
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        console.error("Error playing audio:", e);
        setIsPlaying(false);
      }
    }
  }, [activePlaylist]);

  const handlePlayNext = useCallback(() => {
    if (currentTrackIndex === null) return;
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= activePlaylist.length) {
      if (isLoopingPlaylist) {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    playTrack(nextIndex);
  }, [currentTrackIndex, activePlaylist.length, isLoopingPlaylist, playTrack]);
  
  const handlePlayPrev = useCallback(() => {
    if (currentTrackIndex === null) return;
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = activePlaylist.length - 1;
    }
    playTrack(prevIndex);
  }, [currentTrackIndex, activePlaylist.length, playTrack]);

  const handlePlayPause = useCallback(async () => {
    if (isMic || !currentTrack || !audioElementRef.current) return;
    try {
        if (audioElementRef.current.paused) {
          await audioContextRef.current?.resume();
          await audioElementRef.current.play();
          setIsPlaying(true);
        } else {
          audioElementRef.current.pause();
          setIsPlaying(false);
        }
    } catch (e) {
      console.error("Error toggling play/pause:", e);
      setIsPlaying(false);
    }
  }, [isMic, currentTrack]);
  
  useEffect(() => {
    if (audioElementRef.current) {
        audioElementRef.current.loop = isLoopingSong;
    }
  }, [isLoopingSong]);

  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    const handleEnded = () => {
      if (!isLoopingSong) {
        handlePlayNext();
      }
    };
    const handleTimeUpdate = () => {
        setPlaybackProgress(prev => ({ ...prev, currentTime: audioElement.currentTime }));
    };
    const handleLoadedMetadata = () => {
        setPlaybackProgress({ currentTime: 0, duration: audioElement.duration });
    };

    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [handlePlayNext, isLoopingSong]);
  
  const addFilesToPlaylist = useCallback((files: FileList | null) => {
    if (!files) return;
    const newTracks = Array.from(files)
      .filter(file => file.type.startsWith('audio/'))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.[^/.]+$/, "")
      }));

    if (newTracks.length === 0) return;

    setPlaylist(prevPlaylist => {
      if (prevPlaylist.length === 0) {
        setIsAutoplayScheduled(true);
      }
      const updatedPlaylist = [...prevPlaylist, ...newTracks];
      if (isShuffled) {
          const newShuffledItems = [...newTracks].sort(() => Math.random() - 0.5);
          setShuffledPlaylist(prevShuffled => [...prevShuffled, ...newShuffledItems]);
      }
      return updatedPlaylist;
    });
  }, [isShuffled]);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    cleanupMic();
    setupAudioContext();
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
    }
    
    if (audioContextRef.current && audioElementRef.current && analyserRef.current && gainNodeRef.current) {
        if (!mediaElementSourceRef.current) {
          mediaElementSourceRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
          mediaElementSourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(gainNodeRef.current);
        }
        sourceNodeRef.current = mediaElementSourceRef.current;
    }
    addFilesToPlaylist(e.target.files);
  }, [cleanupMic, setupAudioContext, addFilesToPlaylist]);

  const handleMicClick = useCallback(async () => {
    if (isMic) {
      cleanupMic();
      return;
    }
    
    if (isPlaying) {
      if (audioElementRef.current) {
          audioElementRef.current.pause();
      }
      setIsPlaying(false);
    }

    setupAudioContext();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      if (audioContextRef.current && analyserRef.current) {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
        }
        const micSource = audioContextRef.current.createMediaStreamSource(stream);
        sourceNodeRef.current = micSource;
        sourceNodeRef.current.connect(analyserRef.current);
        setIsMic(true);
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  }, [isMic, setupAudioContext, cleanupMic, isPlaying]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = value[0];
    }
  }, []);

  const handleShuffle = useCallback(() => {
    const willBeShuffled = !isShuffled;
    setIsShuffled(willBeShuffled);
    if (willBeShuffled) {
      const shuffled = [...playlist].sort(() => Math.random() - 0.5);
      const newCurrentTrackId = currentTrack?.id;
      const newIndex = newCurrentTrackId ? shuffled.findIndex(t => t.id === newCurrentTrackId) : 0;
      setShuffledPlaylist(shuffled);
      setCurrentTrackIndex(newIndex);
    } else {
      const newCurrentTrackId = currentTrack?.id;
      const newIndex = newCurrentTrackId ? playlist.findIndex(t => t.id === newCurrentTrackId) : 0;
      setCurrentTrackIndex(newIndex);
      setShuffledPlaylist([]);
    }
  }, [isShuffled, playlist, currentTrack]);
  
  const handleReorderPlaylist = useCallback((reorderedPlaylist: Track[]) => {
      const newCurrentTrackId = currentTrack?.id;
      const newIndex = newCurrentTrackId ? reorderedPlaylist.findIndex(t => t.id === newCurrentTrackId) : 0;
      setPlaylist(reorderedPlaylist);
      setCurrentTrackIndex(newIndex);
  }, [currentTrack?.id]);
  
  const handleRemoveFromPlaylist = useCallback((trackIdToRemove: string) => {
    const wasPlaying = isPlaying;
    const oldCurrentTrackId = currentTrack?.id;
    const isRemovingCurrentTrack = oldCurrentTrackId === trackIdToRemove;

    // Determine the next track index *before* modifying playlists
    let nextTrackIndexToPlay: number | null = null;
    let newActivePlaylistAfterRemoval: Track[] = [];

    if (isShuffled) {
        newActivePlaylistAfterRemoval = shuffledPlaylist.filter(t => t.id !== trackIdToRemove);
    } else {
        newActivePlaylistAfterRemoval = playlist.filter(t => t.id !== trackIdToRemove);
    }
    
    if (isRemovingCurrentTrack) {
        if (newActivePlaylistAfterRemoval.length > 0) {
            // If the current track was removed, the next track is at the same index,
            // unless it was the last track, in which case it wraps around if looping.
            let nextIndex = currentTrackIndex!;
            if (nextIndex >= newActivePlaylistAfterRemoval.length) {
                nextIndex = isLoopingPlaylist ? 0 : -1; // -1 to stop if not looping
            }
            nextTrackIndexToPlay = nextIndex === -1 ? null : nextIndex;
        } else {
            // Stopping playback
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.src = '';
            }
            setIsPlaying(false);
            setCurrentTrackIndex(null);
        }
    }

    // Update state playlists
    const newPlaylist = playlist.filter(t => t.id !== trackIdToRemove);
    setPlaylist(newPlaylist);

    if (isShuffled) {
        setShuffledPlaylist(newActivePlaylistAfterRemoval);
    }

    // Now, trigger playback or update index
    if (isRemovingCurrentTrack) {
        if(nextTrackIndexToPlay !== null) {
            playTrack(nextTrackIndexToPlay);
        } else {
            // This case handles stopping when the last song is removed
            setCurrentTrackIndex(null);
            setIsPlaying(false);
        }
    } else {
        // If we removed a different track, we need to find the new index of the still-current track
        const finalActivePlaylist = isShuffled ? newActivePlaylistAfterRemoval : newPlaylist;
        const newCurrentIndex = oldCurrentTrackId ? finalActivePlaylist.findIndex(t => t.id === oldCurrentTrackId) : -1;
        setCurrentTrackIndex(newCurrentIndex >= 0 ? newCurrentIndex : null);
    }
  }, [playlist, shuffledPlaylist, isShuffled, isPlaying, currentTrack, currentTrackIndex, isLoopingPlaylist, playTrack]);
  
  // This effect handles auto-playing the first track when files are added to an empty playlist.
  useEffect(() => {
    if (isAutoplayScheduled && activePlaylist.length > 0) {
      playTrack(0);
      setIsAutoplayScheduled(false);
    }
  }, [isAutoplayScheduled, activePlaylist, playTrack]);

  // This effect synchronizes playback with the currentTrackIndex state
  useEffect(() => {
    if (currentTrackIndex === null && isPlaying) {
      setIsPlaying(false);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    }
  }, [currentTrackIndex, isPlaying]); 
  
  // --- Drag and Drop ---
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDragEnter = (e: DragEvent) => {
      preventDefaults(e);
      setIsDraggingOver(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      preventDefaults(e);
      if (e.relatedTarget === null || !(e.currentTarget as Element)?.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      preventDefaults(e);
      setIsDraggingOver(false);
      
      cleanupMic();
      setupAudioContext();
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      if (audioContextRef.current && audioElementRef.current && analyserRef.current && gainNodeRef.current) {
        if (!mediaElementSourceRef.current) {
          mediaElementSourceRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
          mediaElementSourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(gainNodeRef.current);
        }
        sourceNodeRef.current = mediaElementSourceRef.current;
      }

      addFilesToPlaylist(e.dataTransfer?.files ?? null);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', handleDrop);
    };
  }, [addFilesToPlaylist, cleanupMic, setupAudioContext]);
  
  const handlePrevBackgroundChange = useCallback(() => {
    setBackgroundMode(prev => BACKGROUND_MODES[(BACKGROUND_MODES.indexOf(prev) - 1 + BACKGROUND_MODES.length) % BACKGROUND_MODES.length]);
  }, []);
  const handleNextBackgroundChange = useCallback(() => {
    setBackgroundMode(prev => BACKGROUND_MODES[(BACKGROUND_MODES.indexOf(prev) + 1) % BACKGROUND_MODES.length]);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) { return; }
    
    switch (e.key) {
      case ' ': e.preventDefault(); handlePlayPause(); break;
      case 'ArrowLeft':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          handlePlayPrev();
        } else {
          handlePrevBackgroundChange();
        }
        break;
      case 'ArrowRight':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          handlePlayNext();
        } else {
          handleNextBackgroundChange();
        }
        break;
      case 'm': case 'M': handleMicClick(); break;
      case 'u': case 'U': document.getElementById('audio-upload')?.click(); break;
      case 'h': case 'H': setAreControlsVisible(p => !p); break;
      case '+': case '=': setAmp(prev => Math.min(20, prev + 1)); break;
      case '-': case '_': setAmp(prev => Math.max(10, prev - 1)); break;
    }
    
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [handlePlayPause, handlePlayPrev, handlePlayNext, handleMicClick, handlePrevBackgroundChange, handleNextBackgroundChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const currentIndex = BACKGROUND_MODES.indexOf(backgroundMode);
  const nextBackgroundTitle = BACKGROUND_TITLES[BACKGROUND_MODES[(currentIndex + 1) % BACKGROUND_MODES.length]];
  const prevBackgroundTitle = BACKGROUND_TITLES[BACKGROUND_MODES[(currentIndex - 1 + BACKGROUND_MODES.length) % BACKGROUND_MODES.length]];

  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if(audioElementRef.current && audioElementRef.current.src) {
         URL.revokeObjectURL(audioElementRef.current.src);
      }
      audioContextRef.current?.close();
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <TooltipProvider>
      <main className="relative w-screen h-screen overflow-hidden">
          {/* Backgrounds */}
          {backgroundMode === 'ascii' && <AsciiBackground analyser={analyser} />}
          {backgroundMode === 'glitch' && <GlitchBackground analyser={analyser} />}
          {backgroundMode === 'typewriter' && <TypewriterBackground analyser={analyser} />}
          {backgroundMode === 'waterfall' && <WaterfallBackground analyser={analyser} />}
          {backgroundMode === 'shard' && <ShardFieldBackground analyser={analyser} />}
          {backgroundMode === 'automata' && <CellularAutomataBackground analyser={analyser} />}
          {backgroundMode === 'thermal' && <ThermalBackground analyser={analyser} />}
          {backgroundMode === 'vortex' && <VortexBackground analyser={analyser} />}
          {backgroundMode === 'harmonic' && <HarmonicOscillatorBackground analyser={analyser} />}
          {backgroundMode === 'portal' && <PortalBackground analyser={analyser} />}
          {backgroundMode === 'glyph-rain' && <GlyphRainBackground analyser={analyser} />}
          {backgroundMode === 'caustics' && <CausticsBackground analyser={analyser} />}
          {backgroundMode === 'root-system' && <RootSystemBackground analyser={analyser} />}
          {backgroundMode === 'text-eq' && <TextEqBackground analyser={analyser} />}
          {backgroundMode === 'character-fluid' && <CharacterFluidBackground analyser={analyser} />}
          {backgroundMode === 'marquee' && <MarqueeBackground analyser={analyser} />}
          {backgroundMode === 'telegraphic-pulse' && <TelegraphicPulseBackground analyser={analyser} />}
          {backgroundMode === 'punch-card' && <PunchCardBackground analyser={analyser} />}
          {backgroundMode === 'old-monitor' && <OldMonitorBackground analyser={analyser} />}
          {backgroundMode === 'sonogram' && <SonogramBackground analyser={analyser} />}
          {backgroundMode === 'retro-grid' && <RetroGridBackground analyser={analyser} />}
          {backgroundMode === 'lcd-bleed' && <LcdBleedBackground analyser={analyser} />}
          
          {isDraggingOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                <p className="text-2xl font-bold text-white">Drop audio files to play</p>
            </div>
          )}

          <div className="w-full h-full">
              <Visualizer analyser={analyser} amp={amp} />
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl z-10 px-4 flex flex-col items-center gap-2">
            <Controls
                isPlaying={isPlaying}
                isMic={isMic}
                onPlayPause={handlePlayPause}
                onFileChange={handleFileChange}
                onMicClick={handleMicClick}
                onAmpChange={(v) => setAmp(v[0])}
                onNextBackgroundChange={handleNextBackgroundChange}
                onPrevBackgroundChange={handlePrevBackgroundChange}
                amp={amp}
                hasAudioSource={playlist.length > 0 || isMic}
                nextBackgroundTitle={nextBackgroundTitle}
                prevBackgroundTitle={prevBackgroundTitle}
                isPlaylistOpen={isPlaylistOpen}
                setIsPlaylistOpen={setIsPlaylistOpen}
                currentTrack={currentTrack}
                isLoopingSong={isLoopingSong}
                toggleLoopSong={() => setIsLoopingSong(p => !p)}
                isLoopingPlaylist={isLoopingPlaylist}
                toggleLoopPlaylist={() => setIsLoopingPlaylist(p => !p)}
                isShuffled={isShuffled}
                toggleShuffle={handleShuffle}
                onPlayNext={handlePlayNext}
                onPlayPrev={handlePlayPrev}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                formatTime={formatTime}
                playbackProgress={playbackProgress}
                onSeek={handleSeek}
                areControlsVisible={areControlsVisible}
                setAreControlsVisible={setAreControlsVisible}
            />
          </div>

          <Sheet open={isPlaylistOpen} onOpenChange={setIsPlaylistOpen}>
            <SheetContent className="w-[350px] sm:w-[540px] bg-background/80 backdrop-blur-sm border-white/20">
                <Playlist
                    playlist={isShuffled ? shuffledPlaylist : playlist}
                    currentTrackId={currentTrack?.id}
                    onTrackSelect={(index) => playTrack(index)}
                    onRemoveTrack={handleRemoveFromPlaylist}
                    onClearPlaylist={() => { setPlaylist([]); setShuffledPlaylist([]); setCurrentTrackIndex(null); setIsPlaying(false); }}
                    onReorderPlaylist={handleReorderPlaylist}
                />
            </SheetContent>
          </Sheet>
      </main>
    </TooltipProvider>
  );
}




    
