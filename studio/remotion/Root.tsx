import React from 'react';
import { Composition, Still } from 'remotion';
import { Reel, type Edl } from './Reel';
import { Slide, type SlideProps } from './stills/Slide';
import { Story, type StoryProps } from './stills/Story';
import { Profile, type ProfileProps } from './stills/Profile';

const EMPTY: Edl = { id: 'empty', fps: 30, width: 1080, height: 1920, durationInFrames: 30, video: [], overlays: [] };

export const Root: React.FC = () => (
  <>
    <Composition
      id="Reel"
      component={Reel as unknown as React.FC<Record<string, unknown>>}
      defaultProps={EMPTY as unknown as Record<string, unknown>}
      durationInFrames={30}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={({ props }) => {
        const p = props as unknown as Edl;
        return { durationInFrames: p.durationInFrames, fps: p.fps, width: p.width, height: p.height };
      }}
    />
    <Still id="Slide" component={Slide as unknown as React.FC<Record<string, unknown>>} width={1080} height={1350} defaultProps={{ kind: 'cover' } as unknown as Record<string, unknown>} />
    <Composition
      id="Story"
      component={Story as unknown as React.FC<Record<string, unknown>>}
      defaultProps={{ kind: 'poll' } as unknown as Record<string, unknown>}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={({ props }) => ({ durationInFrames: (props as unknown as StoryProps).durationInFrames ?? 150 })}
    />
    <Still id="Profile" component={Profile as unknown as React.FC<Record<string, unknown>>} width={1080} height={1080} defaultProps={{ variant: 'emblem' } as unknown as Record<string, unknown>} />
  </>
);

export type { SlideProps, StoryProps, ProfileProps };
