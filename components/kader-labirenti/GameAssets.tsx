import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Path, Circle, Defs, RadialGradient, Stop, G, Rect, LinearGradient, Ellipse } from 'react-native-svg';
import Animated, { useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle } from 'react-native-reanimated';

// ============================================
// PLAYER - Mystical Light Orb (Nur)
// ============================================
export const MysticalOrb = ({ size = 40 }: { size?: number }) => {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="orbGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#FFF9C4" stopOpacity={1} />
                        <Stop offset="40%" stopColor="#FFD54F" stopOpacity={0.9} />
                        <Stop offset="70%" stopColor="#FF8F00" stopOpacity={0.6} />
                        <Stop offset="100%" stopColor="#E65100" stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="coreGlow" cx="50%" cy="50%" rx="30%" ry="30%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                        <Stop offset="100%" stopColor="#FFF59D" stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="45" fill="url(#orbGradient)" />
                <Circle cx="50" cy="50" r="20" fill="url(#coreGlow)" />
                <Circle cx="40" cy="40" r="8" fill="#FFFFFF" opacity={0.7} />
            </Svg>
        </View>
    );
};

// ============================================
// PORTAL - Exit point (Cennet Kapısı)
// ============================================
export const MysticalPortal = ({ size = 60 }: { size?: number }) => {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="portalGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#E8F5E9" stopOpacity={0.9} />
                        <Stop offset="30%" stopColor="#81C784" stopOpacity={0.7} />
                        <Stop offset="60%" stopColor="#4CAF50" stopOpacity={0.8} />
                        <Stop offset="100%" stopColor="#1B5E20" stopOpacity={1} />
                    </RadialGradient>
                    <RadialGradient id="portalCore" cx="50%" cy="50%" rx="20%" ry="20%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                        <Stop offset="100%" stopColor="#A5D6A7" stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                {/* Portal rings */}
                <Circle cx="50" cy="50" r="45" stroke="#4CAF50" strokeWidth="2" fill="none" opacity={0.4} />
                <Circle cx="50" cy="50" r="38" stroke="#66BB6A" strokeWidth="1.5" fill="none" opacity={0.6} />
                <Circle cx="50" cy="50" r="30" stroke="#81C784" strokeWidth="1" fill="none" opacity={0.8} />
                <Circle cx="50" cy="50" r="40" fill="url(#portalGradient)" />
                <Circle cx="50" cy="50" r="15" fill="url(#portalCore)" />
                {/* Star pattern (Islamic geometric) */}
                <Path
                    d="M50,20 L55,40 L75,40 L60,52 L65,72 L50,60 L35,72 L40,52 L25,40 L45,40 Z"
                    fill="#E8F5E9"
                    opacity={0.5}
                />
            </Svg>
        </View>
    );
};

// ============================================
// ENEMY - Şeytan (Evil Masked Figure)
// ============================================
export const SeytanEnemy = ({ size = 45, direction = 1 }: { size?: number; direction?: number }) => {
    const scaleX = direction >= 0 ? 1 : -1;

    return (
        <View style={{ width: size, height: size, transform: [{ scaleX }] }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="seytanGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#4A148C" stopOpacity={0.3} />
                        <Stop offset="70%" stopColor="#1A0033" stopOpacity={0.7} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
                    </RadialGradient>
                    <LinearGradient id="cloakGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#1A0033" />
                        <Stop offset="100%" stopColor="#000000" />
                    </LinearGradient>
                </Defs>
                {/* Dark aura */}
                <Circle cx="50" cy="50" r="48" fill="url(#seytanGlow)" />
                {/* Body/Cloak */}
                <Path
                    d="M50,15 C65,15 75,25 75,40 L80,85 C80,90 75,95 50,95 C25,95 20,90 20,85 L25,40 C25,25 35,15 50,15"
                    fill="url(#cloakGrad)"
                />
                {/* Mask face */}
                <Ellipse cx="50" cy="40" rx="20" ry="22" fill="#2D0047" />
                {/* Glowing evil eyes */}
                <Circle cx="42" cy="38" r="5" fill="#FF1744" />
                <Circle cx="58" cy="38" r="5" fill="#FF1744" />
                <Circle cx="42" cy="38" r="2" fill="#FFEB3B" />
                <Circle cx="58" cy="38" r="2" fill="#FFEB3B" />
                {/* Horns */}
                <Path d="M30,25 Q25,10 35,15 Q40,20 38,28" fill="#1A0033" />
                <Path d="M70,25 Q75,10 65,15 Q60,20 62,28" fill="#1A0033" />
                {/* Evil grin */}
                <Path d="M40,52 Q50,60 60,52" stroke="#FF1744" strokeWidth="2" fill="none" />
            </Svg>
        </View>
    );
};

// ============================================
// COLLECTIBLE - Namaz Taşı (Prayer Stone)
// ============================================
export const NamazTasi = ({ size = 35 }: { size?: number }) => {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="namazGrad" cx="50%" cy="30%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                        <Stop offset="50%" stopColor="#64B5F6" stopOpacity={0.9} />
                        <Stop offset="100%" stopColor="#1565C0" stopOpacity={0.8} />
                    </RadialGradient>
                </Defs>
                {/* Prayer mat shape */}
                <Rect x="15" y="25" width="70" height="55" rx="5" fill="url(#namazGrad)" />
                {/* Mihrab pattern */}
                <Path d="M35,30 L50,20 L65,30 L65,50 Q50,60 35,50 Z" fill="#1976D2" opacity={0.5} />
                {/* Decorative border */}
                <Rect x="18" y="28" width="64" height="49" rx="3" stroke="#FFD700" strokeWidth="1.5" fill="none" />
                {/* Center glow */}
                <Circle cx="50" cy="45" r="10" fill="#FFFFFF" opacity={0.6} />
            </Svg>
        </View>
    );
};

// ============================================
// COLLECTIBLE - Tesbih (Prayer Beads)
// ============================================
export const Tesbih = ({ size = 35 }: { size?: number }) => {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <LinearGradient id="beadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#8D6E63" />
                        <Stop offset="50%" stopColor="#5D4037" />
                        <Stop offset="100%" stopColor="#3E2723" />
                    </LinearGradient>
                </Defs>
                {/* Circle of beads */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const cx = 50 + 30 * Math.cos(rad);
                    const cy = 50 + 30 * Math.sin(rad);
                    return <Circle key={i} cx={cx} cy={cy} r="7" fill="url(#beadGrad)" />;
                })}
                {/* Center larger bead (İmame) */}
                <Circle cx="50" cy="50" r="12" fill="#4E342E" />
                <Circle cx="50" cy="50" r="8" fill="#6D4C41" />
                {/* Highlight */}
                <Circle cx="47" cy="47" r="3" fill="#A1887F" opacity={0.7} />
                {/* Tassel */}
                <Path d="M50,62 L50,85 M45,80 L50,90 L55,80" stroke="#3E2723" strokeWidth="2" />
            </Svg>
        </View>
    );
};

// ============================================
// COLLECTIBLE - Zikir Nuru (Dhikr Light)
// ============================================
export const ZikirNuru = ({ size = 35 }: { size?: number }) => {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="zikirGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                        <Stop offset="30%" stopColor="#E1BEE7" stopOpacity={0.9} />
                        <Stop offset="70%" stopColor="#9C27B0" stopOpacity={0.7} />
                        <Stop offset="100%" stopColor="#4A148C" stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                {/* Outer glow */}
                <Circle cx="50" cy="50" r="45" fill="url(#zikirGrad)" />
                {/* Inner light */}
                <Circle cx="50" cy="50" r="25" fill="#E1BEE7" opacity={0.8} />
                {/* Arabic-style star pattern */}
                <Path
                    d="M50,25 L54,42 L72,42 L58,53 L63,70 L50,59 L37,70 L42,53 L28,42 L46,42 Z"
                    fill="#FFFFFF"
                    opacity={0.9}
                />
                {/* Core */}
                <Circle cx="50" cy="50" r="10" fill="#FFFFFF" />
            </Svg>
        </View>
    );
};

// ============================================
// COLLECTIBLE - Kur'an Nuru (Quran Light) - SPECIAL
// ============================================
export const KuranNuru = ({ size = 40 }: { size?: number }) => {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="kuranGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                        <Stop offset="30%" stopColor="#FFD700" stopOpacity={0.9} />
                        <Stop offset="60%" stopColor="#FFA000" stopOpacity={0.6} />
                        <Stop offset="100%" stopColor="#FF6F00" stopOpacity={0} />
                    </RadialGradient>
                    <LinearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#4CAF50" />
                        <Stop offset="100%" stopColor="#1B5E20" />
                    </LinearGradient>
                </Defs>
                {/* Golden aura */}
                <Circle cx="50" cy="50" r="48" fill="url(#kuranGlow)" />
                {/* Book shape */}
                <Path d="M25,30 L50,25 L75,30 L75,75 L50,80 L25,75 Z" fill="url(#bookGrad)" />
                {/* Book spine */}
                <Path d="M50,25 L50,80" stroke="#2E7D32" strokeWidth="2" />
                {/* Pages */}
                <Rect x="28" y="35" width="20" height="2" fill="#E8F5E9" rx="1" />
                <Rect x="28" y="42" width="18" height="2" fill="#E8F5E9" rx="1" />
                <Rect x="28" y="49" width="20" height="2" fill="#E8F5E9" rx="1" />
                <Rect x="28" y="56" width="16" height="2" fill="#E8F5E9" rx="1" />
                <Rect x="52" y="35" width="20" height="2" fill="#E8F5E9" rx="1" />
                <Rect x="52" y="42" width="18" height="2" fill="#E8F5E9" rx="1" />
                <Rect x="52" y="49" width="20" height="2" fill="#E8F5E9" rx="1" />
                <Rect x="52" y="56" width="16" height="2" fill="#E8F5E9" rx="1" />
                {/* Divine light rays */}
                <Path d="M50,10 L50,20" stroke="#FFD700" strokeWidth="2" />
                <Path d="M30,20 L38,28" stroke="#FFD700" strokeWidth="2" />
                <Path d="M70,20 L62,28" stroke="#FFD700" strokeWidth="2" />
            </Svg>
        </View>
    );
};

// ============================================
// TIME BONUS - Zaman Parçası (Time Fragment)
// ============================================
export const TimeFragment = ({ size = 35 }: { size?: number }) => {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="timeGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                        <Stop offset="30%" stopColor="#FFD700" stopOpacity={0.9} />
                        <Stop offset="70%" stopColor="#FFA000" stopOpacity={0.6} />
                        <Stop offset="100%" stopColor="#FF6F00" stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="40" stroke="#FFD700" strokeWidth="3" fill="none" />
                <Circle cx="50" cy="50" r="30" fill="url(#timeGradient)" />
                {/* Clock hands */}
                <Path d="M50,50 L50,28" stroke="#4A148C" strokeWidth="3" strokeLinecap="round" />
                <Path d="M50,50 L65,50" stroke="#4A148C" strokeWidth="2" strokeLinecap="round" />
                <Circle cx="50" cy="50" r="5" fill="#4A148C" />
                {/* Hour markers */}
                <Circle cx="50" cy="18" r="3" fill="#FFD700" />
                <Circle cx="82" cy="50" r="3" fill="#FFD700" />
                <Circle cx="50" cy="82" r="3" fill="#FFD700" />
                <Circle cx="18" cy="50" r="3" fill="#FFD700" />
            </Svg>
        </View>
    );
};

// Keep old exports for backward compatibility
export const CrystalCollectible = NamazTasi;
export const WallSegment = () => null;

const styles = StyleSheet.create({});
