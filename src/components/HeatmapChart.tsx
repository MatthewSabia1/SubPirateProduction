import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';

interface Post {
  title: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface Props {
  posts: Post[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function interpolateColor(intensity: number): string {
  // Interpolate between a dark base and vibrant green
  const start = { r: 26, g: 26, b: 26 }; // #1a1a1a
  const end = { r: 76, g: 175, b: 80 }; // #4CAF50
  const r = Math.round(start.r + (end.r - start.r) * intensity);
  const g = Math.round(start.g + (end.g - start.g) * intensity);
  const b = Math.round(start.b + (end.b - start.b) * intensity);
  return `rgb(${r}, ${g}, ${b})`;
}

export function HeatmapChart({ posts }: Props) {
  const [tooltipData, setTooltipData] = useState<{
    posts: Post[];
    position: { x: number; y: number };
    dayIndex: number;
    hour: number;
  } | null>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isHoveringTooltip = useRef(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // Create a 2D array to store post data for each hour/day combination
  const grid = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({
      posts: [] as Post[],
      score: 0
    }))
  );

  // Fill the grid with posts
  posts.forEach(post => {
    const date = new Date(post.created_utc * 1000);
    const day = date.getDay();
    const hour = date.getHours();
    grid[day][hour].posts.push(post);
    // Calculate weighted score (75% upvotes, 25% comments)
    grid[day][hour].score += (post.score * 0.75 + post.num_comments * 0.25);
  });

  // Find the maximum score for normalization
  const maxScore = Math.max(
    ...grid.flatMap(row => row.map(cell => cell.score))
  );

  // Calculate cell intensity with extended falloff effect
  const getCellIntensity = (day: number, hour: number) => {
    const baseIntensity = grid[day][hour].score / maxScore;
    let totalIntensity = baseIntensity * 1.2; // Slightly boost the base cell
    
    // Extend falloff effect to a larger range (2 cells in each direction)
    for (let d = -2; d <= 2; d++) {
      for (let h = -2; h <= 2; h++) {
        if (d === 0 && h === 0) continue; // Skip current cell
        
        const neighborDay = (day + d + 7) % 7;
        const neighborHour = (hour + h + 24) % 24;
        const neighborIntensity = grid[neighborDay][neighborHour].score / maxScore;
        
        // Calculate distance-based falloff with gentler curve
        const distance = Math.sqrt(d * d + h * h);
        // Exponential falloff for smoother gradient
        const falloff = Math.exp(-distance * 0.8);
        
        totalIntensity += neighborIntensity * falloff * 0.3; // Reduced neighbor influence for subtler effect
      }
    }
    
    return Math.min(totalIntensity, 1); // Cap at 1
  };

  // Get cell background color with gradient
  const getCellBackground = (intensity: number, isHovered: boolean = false) => {
    // Increased hover boost but maintain flatness
    const displayIntensity = Math.min(intensity + (isHovered ? 0.15 : 0), 1);
    return interpolateColor(displayIntensity);
  };

  // Get cell glow effect
  const getCellGlow = (intensity: number, isHovered: boolean = false) => {
    const effectiveIntensity = isHovered ? Math.min(intensity + 0.2, 1) : intensity;
    if (effectiveIntensity < 0.1) return 'none';
    // Use inset shadow for flat effect
    const spread = Math.round(effectiveIntensity * 16);
    const alpha = effectiveIntensity * 0.4; // Reduced glow opacity for flatness
    return `inset 0 0 ${spread}px rgba(76, 175, 80, ${alpha})`;
  };

  // Get neighboring cells for hover effect
  const getNeighborCoords = (day: number, hour: number) => {
    const neighbors: Array<[number, number]> = [];
    for (let d = -1; d <= 1; d++) {
      for (let h = -1; h <= 1; h++) {
        if (d === 0 && h === 0) continue;
        neighbors.push([
          (day + d + 7) % 7,
          (hour + h + 24) % 24
        ]);
      }
    }
    return neighbors;
  };

  // Get the top 3 posts for a cell
  const getTopPosts = (posts: Post[]) => {
    return [...posts]
      .sort((a, b) => (b.score * 0.75 + b.num_comments * 0.25) - (a.score * 0.75 + a.num_comments * 0.25))
      .slice(0, 3);
  };

  // Format time for display
  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  // Calculate tooltip position relative to viewport
  const getTooltipPosition = (rect: DOMRect, dayIndex: number, hour: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 288; // w-72 = 18rem = 288px
    const tooltipHeight = 280; // Approximate max height of tooltip
    
    // Calculate base position
    let x = rect.left + (rect.width / 2);
    let y = dayIndex <= 2 ? rect.bottom + 8 : rect.top - 8;
    
    // Adjust horizontal position if too close to viewport edges
    if (x + tooltipWidth > viewportWidth - 20) {
      x = rect.right - tooltipWidth;
    } else if (x - tooltipWidth/2 < 20) {
      x = rect.left;
    } else {
      x -= tooltipWidth/2; // Center by default
    }
    
    // Adjust vertical position if too close to viewport edges
    if (y + tooltipHeight > viewportHeight - 20) {
      y = rect.top - tooltipHeight - 8;
    } else if (y < 20) {
      y = rect.bottom + 8;
    }
    
    return { x, y };
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const showTooltip = (cell: HTMLElement, posts: Post[], dayIndex: number, hour: number) => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    
    tooltipTimeoutRef.current = window.setTimeout(() => {
      const rect = cell.getBoundingClientRect();
      const position = getTooltipPosition(rect, dayIndex, hour);
      setTooltipData({
        posts,
        position,
        dayIndex,
        hour
      });
    }, 50); // Small delay to prevent flickering
  };

  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    
    tooltipTimeoutRef.current = window.setTimeout(() => {
      if (!isHoveringTooltip.current) {
        setTooltipData(null);
      }
    }, 100);
  };

  return (
    <div className="w-full">
      <div className="w-full">
        {/* Hour labels with improved alignment */}
        <div className="flex mb-2 pl-[1px]">
          <div className="w-16" /> {/* Same width as day labels */}
          <div className="flex flex-1">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="flex-1 flex justify-center text-xs text-gray-400"
                style={{ paddingRight: hour === 23 ? '1px' : '0' }}
              >
                {hour % 4 === 0 && (
                  <span className="inline-block text-center truncate font-medium">{formatTime(hour)}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grid with consistent spacing */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex items-center h-full mb-[2px]">
            <div className="w-16 text-xs text-gray-400 pr-3 text-right font-medium">{day}</div>
            <div className="flex flex-1">
              {HOURS.map((hour) => {
                const intensity = getCellIntensity(dayIndex, hour);
                const cellPosts = grid[dayIndex][hour].posts;
                const topPosts = getTopPosts(cellPosts);

                return (
                  <div
                    key={hour}
                    className="flex-1 aspect-square relative group"
                    ref={cellRef}
                  >
                    <div
                      className="w-full h-full border border-[#222222] transition-all duration-300 hover:border-emerald-500/30 group-hover:z-10"
                      style={{
                        backgroundColor: getCellBackground(intensity, false),
                        boxShadow: getCellGlow(intensity, false),
                        transition: 'all 0.2s ease-out',
                        ['--tw-ring-color' as string]: 'rgba(76, 175, 80, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        const cell = e.currentTarget;
                        cell.style.backgroundColor = getCellBackground(intensity, true);
                        cell.style.boxShadow = getCellGlow(intensity, true);
                        cell.style.borderColor = 'rgba(76, 175, 80, 0.5)';
                        
                        if (topPosts.length > 0) {
                          showTooltip(cell, cellPosts, dayIndex, hour);
                        }
                        
                        // Add hover effect to neighboring cells with flat aesthetic
                        const neighbors = getNeighborCoords(dayIndex, hour);
                        neighbors.forEach(([d, h], index) => {
                          const neighborCell = document.querySelector(`[data-day="${d}"][data-hour="${h}"]`);
                          if (neighborCell) {
                            const distance = Math.sqrt(
                              Math.pow(d - dayIndex, 2) + Math.pow(h - hour, 2)
                            );
                            const falloff = Math.exp(-distance * 1.2); // Steeper falloff for cleaner edges
                            neighborCell.classList.add('neighbor-hover');
                            (neighborCell as HTMLElement).style.opacity = `${1 - falloff * 0.1}`; // Subtle opacity change
                            (neighborCell as HTMLElement).style.backgroundColor = interpolateColor(
                              Math.min(getCellIntensity(d, h) + falloff * 0.15, 1) // Reduced intensity boost
                            );
                            (neighborCell as HTMLElement).style.borderColor = `rgba(76, 175, 80, ${falloff * 0.2})`; // Subtle border highlight
                          }
                        });
                      }}
                      onMouseLeave={(e) => {
                        const cell = e.currentTarget;
                        cell.style.backgroundColor = getCellBackground(intensity, false);
                        cell.style.boxShadow = getCellGlow(intensity, false);
                        cell.style.borderColor = '#222222';
                        
                        hideTooltip();
                        
                        // Remove hover effect from neighboring cells
                        document.querySelectorAll('.neighbor-hover').forEach(cell => {
                          cell.classList.remove('neighbor-hover');
                          (cell as HTMLElement).style.opacity = '';
                          (cell as HTMLElement).style.borderColor = '#222222';
                          const day = parseInt(cell.getAttribute('data-day') || '0');
                          const hour = parseInt(cell.getAttribute('data-hour') || '0');
                          (cell as HTMLElement).style.backgroundColor = getCellBackground(
                            getCellIntensity(day, hour),
                            false
                          );
                        });
                      }}
                      data-day={dayIndex}
                      data-hour={hour}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Render tooltip using portal */}
      {tooltipData && createPortal(
        <div 
          ref={tooltipRef}
          className="fixed z-[9999] w-72 bg-[#0A0A0A] rounded-lg border border-[#222222] shadow-xl transition-all duration-150"
          style={{
            left: tooltipData.position.x,
            top: tooltipData.position.y,
            boxShadow: '0 0 0 1px rgba(76, 175, 80, 0.1), 0 4px 12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => {
            isHoveringTooltip.current = true;
          }}
          onMouseLeave={() => {
            isHoveringTooltip.current = false;
            hideTooltip();
          }}
        >
          {/* Tooltip Header */}
          <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between bg-[#0F0F0F] rounded-t-lg">
            <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
              {DAYS[tooltipData.dayIndex]} at {formatTime(tooltipData.hour)}
            </div>
            <div className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">
              {tooltipData.posts.length} posts
            </div>
          </div>

          {/* Tooltip Content */}
          <div className="p-2 space-y-1">
            {getTopPosts(tooltipData.posts).map((post, index) => (
              <div 
                key={index} 
                className="p-2.5 rounded-md bg-[#111111] hover:bg-[#141414] transition-colors border border-[#1a1a1a] hover:border-[#222222]"
              >
                <div className="text-sm text-gray-300 line-clamp-2 mb-2 font-medium">
                  {post.title}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400/90">
                    <div className="w-1 h-1 rounded-full bg-emerald-400/50"></div>
                    {post.score.toLocaleString()} points
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-400/90">
                    <div className="w-1 h-1 rounded-full bg-blue-400/50"></div>
                    {post.num_comments.toLocaleString()} comments
                  </div>
                  <div className="text-gray-500 ml-auto">
                    {format(new Date(post.created_utc * 1000), 'h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tooltip Footer */}
          <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#0F0F0F] rounded-b-lg">
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-400/50"></div>
              Average engagement: {Math.round((getTopPosts(tooltipData.posts).reduce((sum, post) => sum + post.score + post.num_comments, 0) / getTopPosts(tooltipData.posts).length)).toLocaleString()}
            </div>
          </div>
        </div>,
        document.body
      )}
      
      <style>
        {`
          .neighbor-hover {
            transition: all 0.2s ease-out !important;
          }
        `}
      </style>
    </div>
  );
} 