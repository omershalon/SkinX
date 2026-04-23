import Svg, { Path, Circle, Line, Rect, Polyline, G, Defs, LinearGradient, Stop } from 'react-native-svg';

const S = 22; // default size
const C = 'rgba(255,255,255,0.5)'; // default color
const W = 1.8; // default stroke width

// ── Gender icons ──
export function MaleIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10} cy={14} r={5} stroke={color} strokeWidth={W} />
      <Path d="M14 10l6-6M16 4h4v4" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FemaleIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={9} r={5} stroke={color} strokeWidth={W} />
      <Line x1={12} y1={14} x2={12} y2={22} stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Line x1={9} y1={18} x2={15} y2={18} stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

export function OtherGenderIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={W} />
      <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// ── Skin type icons ──
export function OilyIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C12 2 6 10 6 14a6 6 0 0012 0c0-4-6-12-6-12z" stroke={color} strokeWidth={W} strokeLinejoin="round" />
    </Svg>
  );
}

export function DryIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={W} />
      <Path d="M8 10c1-1 3-1 4 0s3 1 4 0" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Path d="M8 14c1-1 3-1 4 0s3 1 4 0" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

export function ComboIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={W} />
      <Line x1={12} y1={4} x2={12} y2={20} stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

export function SensitiveIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" stroke={color} strokeWidth={W} strokeLinejoin="round" />
    </Svg>
  );
}

export function NormalIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Polyline points="22 4 12 14.01 9 11.01" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function QuestionIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={W} />
      <Path d="M9 9a3 3 0 015.12 1.5c0 2-3 2.5-3 4.5" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Circle cx={12} cy={18} r={0.5} fill={color} />
    </Svg>
  );
}

// ── Duration icons ──
export function ClockIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={W} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// ── Goal icons ──
export function TargetIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={W} />
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={W} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}

export function TrendDownIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="23 18 13.5 8.5 8.5 13.5 1 6" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ShieldIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={W} strokeLinejoin="round" />
    </Svg>
  );
}

export function LockIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Shackle — chunky rounded arc, drawn first so body covers the bottom ends */}
      <Path
        d="M7 11 V8 A5 5 0 0 1 17 8 V11"
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Body with keyhole cut out via evenodd — keeps the whole icon a single color */}
      <Path
        d="M6 10 H18 A2.2 2.2 0 0 1 20.2 12.2 V19.8 A2.2 2.2 0 0 1 18 22 H6 A2.2 2.2 0 0 1 3.8 19.8 V12.2 A2.2 2.2 0 0 1 6 10 Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}

export function SparkleIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7l2-7z" stroke={color} strokeWidth={W} strokeLinejoin="round" />
    </Svg>
  );
}

// ── Holistic icons ──
export function LeafIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 8c2-5-7-6-13-2 4 8 11 8 13 2z" stroke={color} strokeWidth={W} strokeLinejoin="round" />
      <Path d="M6 16c2-2 4-3 8-4" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// ── Barrier icons ──
export function BlockIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={W} />
      <Line x1={5.7} y1={5.7} x2={18.3} y2={18.3} stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// ── Commitment icons ──
export function FlameIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22c4.97 0 8-3.03 8-8 0-4-2.5-7-4-9-1.5 2-2 3.5-2 5 0 0-2-1.5-2-4 0-2 1-4 2-5.5C12 3 10 5 9 7c-1.5 2-3 4-3 7 0 4.97 3.03 8 6 8z" stroke={color} strokeWidth={W} strokeLinejoin="round" />
    </Svg>
  );
}

// ── Tried icons ──
export function PillIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={8} width={16} height={8} rx={4} stroke={color} strokeWidth={W} />
      <Line x1={12} y1={8} x2={12} y2={16} stroke={color} strokeWidth={W} />
    </Svg>
  );
}

export function BottleIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={7} y={10} width={10} height={11} rx={2} stroke={color} strokeWidth={W} />
      <Path d="M9 10V7h6v3" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Rect x={10} y={4} width={4} height={3} rx={1} stroke={color} strokeWidth={W} />
    </Svg>
  );
}

export function SaladIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12h16" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Path d="M4 12c0 4.4 3.6 8 8 8s8-3.6 8-8" stroke={color} strokeWidth={W} />
      <Path d="M8 12V8c0-1.1.9-2 2-2M14 12V9c0-1.7 1.3-3 3-3" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

export function DoctorIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={W} />
      <Path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Path d="M10 14v3h4v-3" stroke={color} strokeWidth={W} />
    </Svg>
  );
}

export function FacialIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={W} />
      <Circle cx={9} cy={10} r={1} fill={color} />
      <Circle cx={15} cy={10} r={1} fill={color} />
      <Path d="M8 15c1.5 2 6.5 2 8 0" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

export function EmptyIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={16} height={16} rx={3} stroke={color} strokeWidth={W} />
    </Svg>
  );
}

// ── Concern icons ──
export function BreakoutIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={10} r={2} stroke={color} strokeWidth={W} />
      <Circle cx={16} cy={8} r={1.5} stroke={color} strokeWidth={W} />
      <Circle cx={12} cy={16} r={2.5} stroke={color} strokeWidth={W} />
    </Svg>
  );
}

export function ScarIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 18L18 6" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Path d="M9 6l-3 3M18 15l-3 3" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SunIcon({ size = S, color = C }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={W} />
      <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// ── Brand / source icons (for "Where did you hear about us?") ──
import { View, StyleSheet } from 'react-native';

function BrandIcon({ bg, children, size = 32 }: { bg: string; children: React.ReactNode; size?: number }) {
  return (
    <View style={[brandStyles.container, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: bg }]}>
      {children}
    </View>
  );
}

const brandStyles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
});

export function XBrandIcon({ size = 32 }: { size?: number }) {
  const i = size * 0.45;
  return (
    <BrandIcon bg="#000" size={size}>
      <Svg width={i} height={i} viewBox="0 0 24 24" fill="#fff">
        <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </Svg>
    </BrandIcon>
  );
}

export function AppStoreBrandIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[brandStyles.container, { width: size, height: size, borderRadius: size * 0.22, overflow: 'hidden' }]}>
      <Svg width={size} height={size} viewBox="0 0 800 800">
        <Defs>
          <LinearGradient id="appStoreGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#18BFFB" />
            <Stop offset="100%" stopColor="#2072F3" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={800} height={800} fill="url(#appStoreGrad)" />
        <Path fill="#fff" d="M396.6,183.8l16.2-28c10-17.5,32.3-23.4,49.8-13.4s23.4,32.3,13.4,49.8L319.9,462.4h112.9 c36.6,0,57.1,43,41.2,72.8H143c-20.2,0-36.4-16.2-36.4-36.4c0-20.2,16.2-36.4,36.4-36.4h92.8l118.8-205.9l-37.1-64.4 c-10-17.5-4.1-39.6,13.4-49.8c17.5-10,39.6-4.1,49.8,13.4L396.6,183.8L396.6,183.8z M256.2,572.7l-35,60.7 c-10,17.5-32.3,23.4-49.8,13.4S148,614.5,158,597l26-45C213.4,542.9,237.3,549.9,256.2,572.7L256.2,572.7z M557.6,462.6h94.7 c20.2,0,36.4,16.2,36.4,36.4c0,20.2-16.2,36.4-36.4,36.4h-52.6l35.5,61.6c10,17.5,4.1,39.6-13.4,49.8c-17.5,10-39.6,4.1-49.8-13.4 c-59.8-103.7-104.7-181.3-134.5-233c-30.5-52.6-8.7-105.4,12.8-123.3C474.2,318.1,509.9,380,557.6,462.6L557.6,462.6z" />
      </Svg>
    </View>
  );
}

export function YouTubeBrandIcon({ size = 32 }: { size?: number }) {
  const i = size * 0.55;
  return (
    <BrandIcon bg="#FF0000" size={size}>
      <Svg width={i} height={i} viewBox="0 0 24 24" fill="#fff">
        <Path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.4-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
      </Svg>
    </BrandIcon>
  );
}

export function FriendsBrandIcon({ size = 32 }: { size?: number }) {
  const i = size * 0.5;
  return (
    <BrandIcon bg="#6B7280" size={size}>
      <Svg width={i} height={i} viewBox="0 0 24 24" fill="none">
        <Circle cx={9} cy={7} r={3} stroke="#fff" strokeWidth={2} />
        <Path d="M2 20c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <Circle cx={17} cy={8} r={2.5} stroke="#fff" strokeWidth={2} />
        <Path d="M19 14c2.2.5 4 2.5 4 5" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </BrandIcon>
  );
}

export function TVBrandIcon({ size = 32 }: { size?: number }) {
  const i = size * 0.5;
  return (
    <BrandIcon bg="#374151" size={size}>
      <Svg width={i} height={i} viewBox="0 0 24 24" fill="none">
        <Rect x={2} y={4} width={20} height={14} rx={2} stroke="#fff" strokeWidth={2} />
        <Path d="M8 21h8" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </BrandIcon>
  );
}

export function InstagramBrandIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[brandStyles.container, { width: size, height: size, borderRadius: size * 0.22, overflow: 'hidden' }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FFDC80" />
            <Stop offset="25%" stopColor="#F77737" />
            <Stop offset="50%" stopColor="#E1306C" />
            <Stop offset="75%" stopColor="#C13584" />
            <Stop offset="100%" stopColor="#833AB4" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill="url(#igGrad)" />
        <Rect x={15} y={15} width={70} height={70} rx={20} stroke="#fff" strokeWidth={7} fill="none" />
        <Circle cx={50} cy={50} r={17} stroke="#fff" strokeWidth={7} fill="none" />
        <Circle cx={73} cy={27} r={5} fill="#fff" />
      </Svg>
    </View>
  );
}

export function TikTokBrandIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[brandStyles.container, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: '#000' }]}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 50 50" style={{ marginLeft: size * 0.02 }}>
        <G transform="translate(3, 2)">
          <Path d="M30 5c-1.5-1.7-2.4-3.9-2.5-6h-6.5v28c0 3.4-2.8 6.2-6.2 6.2S8.6 30.4 8.6 27s2.8-6.2 6.2-6.2c.7 0 1.3.1 1.9.3v-6.7c-.6-.1-1.3-.1-1.9-.1C7.7 14.3 2 20 2 27.1s5.7 12.8 12.8 12.8 12.8-5.7 12.8-12.8V14c2.5 1.8 5.6 2.9 8.8 2.9V10.2c-2.5 0-4.9-1.5-6.4-5.2z" fill="#25F4EE" />
          <Path d="M32 6c-1.5-1.7-2.4-3.9-2.5-6h-6.5v28c0 3.4-2.8 6.2-6.2 6.2s-6.2-2.8-6.2-6.2 2.8-6.2 6.2-6.2c.7 0 1.3.1 1.9.3v-6.7c-.6-.1-1.3-.1-1.9-.1C9.7 15.3 4 21 4 28.1s5.7 12.8 12.8 12.8 12.8-5.7 12.8-12.8V15c2.5 1.8 5.6 2.9 8.8 2.9V11.2c-2.5 0-4.9-1.5-6.4-5.2z" fill="#FE2C55" />
          <Path d="M31 5.5c-1.5-1.7-2.4-3.9-2.5-6h-6.5v28c0 3.4-2.8 6.2-6.2 6.2s-6.2-2.8-6.2-6.2 2.8-6.2 6.2-6.2c.7 0 1.3.1 1.9.3v-6.7c-.6-.1-1.3-.1-1.9-.1C8.7 14.8 3 20.5 3 27.6s5.7 12.8 12.8 12.8 12.8-5.7 12.8-12.8V14.5c2.5 1.8 5.6 2.9 8.8 2.9V10.7c-2.5 0-4.9-1.5-6.4-5.2z" fill="#fff" />
        </G>
      </Svg>
    </View>
  );
}

export function GoogleBrandIcon({ size = 32 }: { size?: number }) {
  const i = size * 0.5;
  return (
    <BrandIcon bg="#fff" size={size}>
      <Svg width={i} height={i} viewBox="0 0 24 24">
        <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </Svg>
    </BrandIcon>
  );
}

export function FacebookBrandIcon({ size = 32 }: { size?: number }) {
  const i = size * 0.5;
  return (
    <BrandIcon bg="#1877F2" size={size}>
      <Svg width={i} height={i} viewBox="0 0 24 24" fill="#fff">
        <Path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" />
      </Svg>
    </BrandIcon>
  );
}

export function OtherBrandIcon({ size = 32 }: { size?: number }) {
  const i = size * 0.45;
  return (
    <BrandIcon bg="#9CA3AF" size={size}>
      <Svg width={i} height={i} viewBox="0 0 24 24" fill="none">
        <Circle cx={5} cy={12} r={2} fill="#fff" />
        <Circle cx={12} cy={12} r={2} fill="#fff" />
        <Circle cx={19} cy={12} r={2} fill="#fff" />
      </Svg>
    </BrandIcon>
  );
}

export function ThumbsUpIcon({ size = 32, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 22">
      <Rect x={2} y={12} width={4} height={10} rx={1.5} fill={color} />
      <Path d="M8 22h8a3 3 0 002.9-2.3l1.4-6A3 3 0 0017.4 10H14V5.5A2.5 2.5 0 0011.5 3c-.7 0-1.3.4-1.5 1L8 12v10z" fill={color} />
    </Svg>
  );
}

export function ThumbsDownIcon({ size = 32, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 22">
      <Rect x={18} y={0} width={4} height={10} rx={1.5} fill={color} />
      <Path d="M16 0H8a3 3 0 00-2.9 2.3l-1.4 6A3 3 0 006.6 12H10v4.5a2.5 2.5 0 002.5 2.5c.7 0 1.3-.4 1.5-1L16 10V0z" fill={color} />
    </Svg>
  );
}
