import React from 'react';
import Svg, { Circle, Path, Defs, RadialGradient, LinearGradient, Stop, G, Rect, Polygon, Ellipse, Text } from 'react-native-svg';

// --- AVATAR (UÇAN İNSAN - Pelerinli Kahraman) ---
export const AvatarHero = ({ size = 60, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Defs>
      <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#FCD34D" stopOpacity="0.8" />
        <Stop offset="1" stopColor="#FCD34D" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="256" cy="256" r="250" fill="url(#glow)" opacity={0.4} />
    <G transform="translate(0, 50)" scale="0.9">
       <Path d="M150 300 Q 256 450 362 300 L 300 200 L 212 200 Z" fill="#FBBF24" />
       <Circle cx="256" cy="120" r="50" fill="white" />
       <Path 
         d="M200 180 L 200 100 L 180 60 M 312 180 L 312 100 L 332 60 
            M 200 180 L 312 180 L 280 350 L 232 350 Z" 
         fill="white" stroke="white" strokeWidth="20" strokeLinejoin="round"
       />
    </G>
  </Svg>
);

// --- KÖTÜ ENGELLER ---

export const ObstacleLust = ({ size = 50 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M10 50 Q 50 10 90 50 Q 50 90 10 50 Z" fill="#F1F5F9" stroke="#B91C1C" strokeWidth="2" />
    <Circle cx="50" cy="50" r="18" fill="#B91C1C" />
    <Circle cx="50" cy="50" r="8" fill="black" />
    <Circle cx="55" cy="45" r="4" fill="white" opacity="0.8" />
    <Path d="M15 50 Q 30 40 35 50 M 85 50 Q 70 60 65 50" stroke="#EF4444" strokeWidth="1" opacity="0.5" />
  </Svg>
);

export const ObstacleSatan = ({ size = 50 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
     <Circle cx="50" cy="50" r="45" fill="#4C1D95" opacity="0.3" />
     <Path 
       d="M30 80 Q 10 50 50 50 Q 90 50 70 20" 
       fill="none" stroke="#7E22CE" strokeWidth="8" strokeLinecap="round"
     />
     <Path d="M70 20 L 60 10 L 80 10 Z" fill="#EF4444" />
     <Circle cx="70" cy="18" r="2" fill="yellow" />
  </Svg>
);

export const ObstacleEgo = ({ size = 60 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path 
      d="M20 30 Q 50 5 80 30 Q 90 60 50 90 Q 10 60 20 30 Z" 
      fill="#334155" stroke="#94A3B8" strokeWidth="2"
    />
    <Path d="M35 40 Q 40 35 45 40" stroke="#EF4444" strokeWidth="3" />
    <Path d="M55 40 Q 60 35 65 40" stroke="#EF4444" strokeWidth="3" />
    <Path d="M40 70 Q 50 80 60 70" stroke="#F87171" strokeWidth="2" fill="none" />
  </Svg>
);

// --- İYİ AMELLER (YENİLENMİŞ PARLAK GÖRSELLER) ---

// Namaz (Altın Kubbeli Cami ve Seccade)
export const NurPrayer = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#FFFBEB" stopOpacity="1" />
        <Stop offset="0.6" stopColor="#FCD34D" stopOpacity="0.8" />
        <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    {/* Işık Halesi */}
    <Circle cx="50" cy="50" r="48" fill="url(#goldGlow)" opacity={0.6} />
    {/* Cami Silüeti */}
    <Path d="M25 75 L 75 75 L 75 55 Q 50 25 25 55 Z" fill="#B45309" stroke="white" strokeWidth="1" />
    <Circle cx="50" cy="35" r="3" fill="#FCD34D" />
    <Rect x="45" y="35" width="10" height="20" fill="#B45309" />
    <Circle cx="50" cy="30" r="10" fill="#FCD34D" opacity="0.5" />
  </Svg>
);

// Oruç (Hurma Tabağı ve Hilal)
export const NurFasting = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#EFF6FF" />
        <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#blueGlow)" opacity={0.5} />
    {/* Hilal */}
    <Path d="M70 30 A 25 25 0 1 0 70 70 A 20 20 0 1 1 70 30 Z" fill="#FBBF24" stroke="white" strokeWidth="1" />
    {/* Hurma Tanesi */}
    <Ellipse cx="40" cy="55" rx="10" ry="6" fill="#78350F" transform="rotate(-20 40 55)" />
  </Svg>
);

// Sadaka (Altın Para Saçan Kese)
export const NurCharity = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="greenGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#ECFDF5" />
        <Stop offset="1" stopColor="#10B981" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#greenGlow)" opacity={0.5} />
    {/* Kese */}
    <Path d="M35 70 Q 25 80 40 85 L 60 85 Q 75 80 65 70 L 55 40 L 45 40 Z" fill="#B45309" />
    {/* Paralar */}
    <Circle cx="50" cy="35" r="8" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2" />
    <Text x="47" y="38" fontSize="8" fill="#B45309">₺</Text>
    <Circle cx="65" cy="50" r="5" fill="#FCD34D" />
    <Circle cx="35" cy="50" r="5" fill="#FCD34D" />
  </Svg>
);

// Gece Namazı (Yıldızlı Gece ve Seccade)
export const NurNightPrayer = ({ size = 50 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id="nightGlow" cx="50" cy="50" r="50">
        <Stop offset="0" stopColor="#C7D2FE" />
        <Stop offset="1" stopColor="#312E81" />
      </RadialGradient>
    </Defs>
    <Circle cx="50" cy="50" r="48" fill="url(#nightGlow)" />
    <Path d="M60 30 A 20 20 0 1 0 60 70 A 15 15 0 1 1 60 30 Z" fill="#FCD34D" />
    {/* Parlayan +1 */}
    <Circle cx="75" cy="25" r="15" fill="#EF4444" />
    <Path d="M75 18 L 75 32 M 68 25 L 82 25" stroke="white" strokeWidth="3" />
  </Svg>
);
