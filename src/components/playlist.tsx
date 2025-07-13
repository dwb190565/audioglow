
"use client";

import React, { useState } from 'react';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { GripVertical, Music, Trash2, X } from 'lucide-react';
import type { Track } from '@/app/page';

interface PlaylistProps {
  playlist: Track[];
  currentTrackId?: string;
  onTrackSelect: (index: number) => void;
  onRemoveTrack: (id: string) => void;
  onClearPlaylist: () => void;
  onReorderPlaylist: (reorderedPlaylist: Track[]) => void;
}

const Playlist: React.FC<PlaylistProps> = ({
  playlist,
  currentTrackId,
  onTrackSelect,
  onRemoveTrack,
  onClearPlaylist,
  onReorderPlaylist
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const reorderedPlaylist = [...playlist];
    const [draggedItem] = reorderedPlaylist.splice(draggedIndex, 1);
    reorderedPlaylist.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    onReorderPlaylist(reorderedPlaylist);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-4 border-b border-white/20">
        <SheetTitle>Playlist</SheetTitle>
        <div className="flex justify-between items-center">
          <SheetDescription>{playlist.length} track{playlist.length !== 1 ? 's' : ''} in queue.</SheetDescription>
          <Button variant="ghost" size="sm" onClick={onClearPlaylist} disabled={playlist.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
        </div>
      </SheetHeader>
      
      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-2">
          {playlist.length > 0 ? (
            playlist.map((track, index) => (
              <div
                key={track.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onTrackSelect(index)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md transition-all cursor-pointer",
                  currentTrackId === track.id ? 'bg-primary/20' : 'hover:bg-accent/50',
                  draggedIndex === index ? 'playlist-item-dragging opacity-50 bg-primary/20' : 'cursor-grab active:cursor-grabbing'
                )}
              >
                <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-grow truncate">
                  <p className="font-medium truncate">{track.title}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 flex-shrink-0" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent onTrackSelect from firing
                    onRemoveTrack(track.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Music className="w-12 h-12 mb-4" />
              <p className="font-semibold">Your playlist is empty</p>
              <p className="text-sm">Upload or drop audio files to begin.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Playlist;

    