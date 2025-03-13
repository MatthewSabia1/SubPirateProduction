import React from 'react';
import { RouteObject } from 'react-router-dom';

// This file is used by TempoLabs to define routes for storyboards
// It's only included when the VITE_TEMPO environment variable is set to true

const routes: RouteObject[] = [
  {
    path: "/tempobook/*",
    element: <div /> // Empty element as this will be handled by TempoLabs
  }
];

export default routes; 