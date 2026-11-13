import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { MainV } from "./MainV";
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={5533} fps={30} width={1920} height={1080} />
    <Composition id="Vertical" component={MainV} durationInFrames={5533} fps={30} width={1080} height={1920} />
  </>
);
