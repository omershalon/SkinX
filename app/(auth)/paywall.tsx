import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { supabase } from "@/lib/supabase";
import { Fonts } from "@/lib/theme";

const { width } = Dimensions.get("window");

type PlanType = "weekly" | "yearly";

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [firstName, setFirstName] = useState("Dari");
  const [loading, setLoading] = useState(false);

  const titleFont = useMemo(
    () => (Platform.OS === "ios" ? "Georgia" : Fonts.bold),
    []
  );

  useEffect(() => {
    loadFirstName();
  }, []);

  async function loadFirstName() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const fullName = data?.full_name?.trim();
      if (fullName) {
        setFirstName(fullName.split(" ")[0]);
      }
    } catch {
      // Keep fallback name.
    }
  }

  async function handleUnlock() {
    try {
      setLoading(true);

      // Preserve existing generate-plan behavior.
      if (params.from === "scan") {
        const { data, error } = await supabase.functions.invoke("generate-plan", {
          body: {
            plan: selectedPlan,
          },
        });

        if (error) throw error;

        router.replace({
          pathname: "/(tabs)",
          params: {
            generatedPlan: JSON.stringify(data ?? {}),
          },
        });

        return;
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Could not unlock plan",
        error?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const next = () => {
    if (step < 2) setStep(step + 1);
    else handleUnlock();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else if (router.canGoBack()) router.back();
  };

  const isWelcome = step === 0;
  const isHero = step <= 2;

  return (
    <View style={styles.screen}>
      {!isHero && <CosmicGlow />}

      <Pressable
        onPress={back}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 14 }]}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 18 L9 12 L15 6"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (isHero ? 8 : 26),
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {!isHero && (
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i <= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        )}

        {step === 0 && (
          <StepOne titleFont={titleFont} firstName={firstName} />
        )}

        {step === 1 && (
          <StepTwo
            titleFont={titleFont}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
          />
        )}

        {step === 2 && (
          <StepThree
            titleFont={titleFont}
            firstName={firstName}
            selectedPlan={selectedPlan}
          />
        )}

        <View style={styles.bottomArea}>
          {isHero ? (
            <Pressable
              onPress={next}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButtonHeroShell,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <LinearGradient
                colors={["#A78BFA", "#7C5CFC", "#5B3FB8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.primaryButtonHeroFill}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.primaryButtonText, styles.primaryButtonTextWelcome]}>
                    {step === 0
                  ? "Start my free trial"
                  : step === 1
                    ? "Continue"
                    : "Try for $0.00"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={next}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryButtonText}>Unlock My Plan</Text>
              )}
            </Pressable>
          )}

          <Text style={styles.footerText}>
            {step === 0
              ? "3-day free trial, then $6.99/week"
              : step === 1
                ? "No charge today • Cancel anytime during trial"
                : selectedPlan === "yearly"
                  ? "$0 due today, then $39.99 when trial expires"
                  : "$0 due today, then $6.99 when trial expires"}
          </Text>

          {isHero && (
            <View style={styles.legalRow}>
              <Pressable hitSlop={8}>
                <Text style={styles.legalLink}>Terms</Text>
              </Pressable>
              <Pressable hitSlop={8}>
                <Text style={styles.legalLink}>Privacy</Text>
              </Pressable>
              <Pressable hitSlop={8}>
                <Text style={styles.legalLink}>Restore</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StepOne({
  titleFont,
  firstName,
}: {
  titleFont: string;
  firstName: string;
}) {
  return (
    <View style={styles.welcomeStep}>
      <View style={styles.welcomeLogoWrap}>
        <Text style={[styles.welcomeLogo, { fontFamily: titleFont }]}>X</Text>
      </View>

      <Text style={[styles.welcomeTitle, { fontFamily: titleFont }]}>
        Welcome, {firstName}!
      </Text>

      <Text style={styles.welcomeParagraph}>
        Your skin journey starts here.{"\n"}
        We created SkinX to help you understand your skin, build a routine that
        fits you, and stay consistent with real progress.
      </Text>

      <Text style={styles.welcomeParagraph}>
        From personalized insights to step-by-step guidance, SkinX helps you
        make smarter skincare decisions with confidence.
      </Text>

      <Text style={styles.welcomeParagraph}>
        You've unlocked a free 3-day trial to explore your personalized plan.
        Cancel anytime before it ends and you won't be charged.
      </Text>

      <Text style={[styles.welcomeSignature, { fontFamily: titleFont }]}>
        The SkinX Team
      </Text>
    </View>
  );
}

function StepTwo({
  titleFont,
  selectedPlan,
  setSelectedPlan,
}: {
  titleFont: string;
  selectedPlan: PlanType;
  setSelectedPlan: (plan: PlanType) => void;
}) {
  return (
    <View style={styles.welcomeStep}>
      <View style={styles.welcomeLogoWrap}>
        <Text style={[styles.welcomeLogo, { fontFamily: titleFont }]}>X</Text>
      </View>

      <Text style={[styles.welcomeTitle, { fontFamily: titleFont }]}>
        Choose your plan
      </Text>

      <Text style={styles.planSubtitle}>
        Pick the option that fits you best.{"\n"}You can change anytime.
      </Text>

      <View style={styles.planStack}>
        <PlanCard
          active={selectedPlan === "yearly"}
          label="Yearly"
          badge="Recommended"
          discount="52.3% OFF"
          titleFont={titleFont}
          onPress={() => setSelectedPlan("yearly")}
        />

        <PlanCard
          active={selectedPlan === "weekly"}
          label="Weekly"
          titleFont={titleFont}
          onPress={() => setSelectedPlan("weekly")}
        />
      </View>
    </View>
  );
}

function StepThree({
  titleFont,
  firstName,
  selectedPlan,
}: {
  titleFont: string;
  firstName: string;
  selectedPlan: PlanType;
}) {
  const planLabel =
    selectedPlan === "yearly" ? "Yearly plan selected" : "Weekly plan selected";
  const priceLine =
    selectedPlan === "yearly"
      ? "$39.99 per year ($3.33/month)."
      : "$6.99 per week.";
  const benefitTwoText =
    selectedPlan === "yearly"
      ? "Keep your progress going with the yearly plan"
      : "Keep your progress going each week";

  return (
    <View style={[styles.welcomeStep, styles.welcomeStepStatic]}>
      <PremiumAura />

      <View style={styles.welcomeLogoWrapSmall}>
        <Text style={[styles.welcomeLogoSmall, { fontFamily: titleFont }]}>
          X
        </Text>
      </View>

      <Text style={[styles.skinXMark, { fontFamily: titleFont }]}>SkinX</Text>

      <Text
        style={[
          styles.welcomeTitle,
          styles.welcomeTitleCompact,
          { fontFamily: titleFont },
        ]}
      >
        Start free today
      </Text>

      <Text style={[styles.planSubtitle, styles.planSubtitleCompact]}>
        Enjoy full access with a 3-day free trial.{"\n"}
        Cancel anytime before renewal.
      </Text>

      <View style={styles.benefitStack}>
        <BenefitRow
          icon={<BoltIcon />}
          title="Instant full access"
          description={"Your personalized skin plan\nstarts right away"}
          titleFont={titleFont}
        />
        <BenefitRow
          icon={<CalendarCheckIcon />}
          title="Stay consistent"
          description={benefitTwoText}
          titleFont={titleFont}
        />
      </View>

      <View style={styles.pillsRow}>
        <TrialPill icon={<CalendarMiniIcon />} text="3-day free trial" />
        <TrialPill icon={<RefreshMiniIcon />} text="Cancel anytime" />
        <TrialPill icon={<StarMiniIcon />} text={planLabel} />
      </View>

      <Text style={[styles.finalTitle, { fontFamily: titleFont }]}>
        {firstName}, your best skin starts now
      </Text>

      <Text style={styles.finalPriceLine}>{priceLine}</Text>
    </View>
  );
}

function BenefitRow({
  icon,
  title,
  description,
  titleFont,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  titleFont: string;
}) {
  return (
    <View style={styles.benefitCardOuter}>
      <LinearGradient
        colors={["rgba(124,92,252,0.18)", "rgba(15,8,32,0.92)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.benefitCardFill}
      >
        <View style={styles.benefitIconWrap}>
          <LinearGradient
            colors={["rgba(167,139,250,0.55)", "rgba(76,29,149,0.95)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.benefitIconInner}
          >
            {icon}
          </LinearGradient>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.benefitTitle, { fontFamily: titleFont }]}>
            {title}
          </Text>
          <Text style={styles.benefitDesc}>{description}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function TrialPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <View style={styles.trialPillOuter}>
      <LinearGradient
        colors={["rgba(124,92,252,0.22)", "rgba(76,29,149,0.18)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.trialPillFill}
      >
        {icon}
        <Text style={styles.trialPillText}>{text}</Text>
      </LinearGradient>
    </View>
  );
}

function PremiumAura() {
  return (
    <View pointerEvents="none" style={styles.premiumAuraWrap}>
      <Svg width={width} height={420} viewBox={`0 0 ${width} 420`}>
        <Defs>
          <SvgLinearGradient id="auraFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7C3AED" stopOpacity="0.32" />
            <Stop offset="0.6" stopColor="#5B21B6" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Ellipse
          cx={width / 2}
          cy={-30}
          rx={width * 0.85}
          ry={310}
          fill="url(#auraFill)"
        />
      </Svg>
    </View>
  );
}

function BoltIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M13 2 L4 14 H11 L10 22 L20 10 H13 L14 2 Z"
        fill="#B69BFF"
        stroke="#C4B5FD"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarCheckIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        stroke="#B69BFF"
        strokeWidth="1.8"
      />
      <Path
        d="M3 9 H21"
        stroke="#B69BFF"
        strokeWidth="1.8"
      />
      <Path d="M8 3 V7 M16 3 V7" stroke="#B69BFF" strokeWidth="1.8" strokeLinecap="round" />
      <Path
        d="M8 14 L11 17 L16 12"
        stroke="#B69BFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarMiniIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="3" stroke="#B69BFF" strokeWidth="1.8" />
      <Path d="M3 9 H21" stroke="#B69BFF" strokeWidth="1.8" />
      <Path d="M8 3 V7 M16 3 V7" stroke="#B69BFF" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function RefreshMiniIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12 a8 8 0 0 1 14-5 M20 4 V8 H16"
        stroke="#B69BFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 12 a8 8 0 0 1 -14 5 M4 20 V16 H8"
        stroke="#B69BFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StarMiniIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 L14.5 9 L21 9.7 L16 14 L17.5 20.5 L12 17 L6.5 20.5 L8 14 L3 9.7 L9.5 9 Z"
        stroke="#B69BFF"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LaurelBadge({ titleFont }: { titleFont: string }) {
  const leftLeaves = [
    { x: -32, y: 30, rot: -100 },
    { x: -48, y: 18, rot: -78 },
    { x: -58, y: 0, rot: -58 },
    { x: -62, y: -18, rot: -38 },
    { x: -58, y: -36, rot: -18 },
    { x: -48, y: -52, rot: 0 },
    { x: -32, y: -62, rot: 18 },
  ];

  return (
    <View style={styles.laurelWrap}>
      <Svg width={220} height={150} viewBox="-110 -75 220 150">
        <Defs>
          <SvgLinearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="1" stopColor="#c4b5fd" stopOpacity="0.85" />
          </SvgLinearGradient>
          <SvgLinearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#B69BFF" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#B69BFF" stopOpacity="1" />
            <Stop offset="1" stopColor="#B69BFF" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        <Ellipse cx="0" cy="55" rx="58" ry="3" fill="url(#glowGrad)" />
        <Ellipse cx="0" cy="55" rx="34" ry="1.4" fill="#fff" opacity="0.85" />

        {leftLeaves.map((l, i) => (
          <G
            key={`L${i}`}
            transform={`translate(${l.x} ${l.y}) rotate(${l.rot})`}
          >
            <Path
              d="M 0 0 C 5 -9 13 -9 17 0 C 13 5 5 5 0 0 Z"
              fill="url(#leafGrad)"
              stroke="#B69BFF"
              strokeOpacity="0.4"
              strokeWidth="0.4"
            />
          </G>
        ))}

        {leftLeaves.map((l, i) => (
          <G
            key={`R${i}`}
            transform={`translate(${-l.x} ${l.y}) rotate(${-l.rot})`}
          >
            <Path
              d="M 0 0 C -5 -9 -13 -9 -17 0 C -13 5 -5 5 0 0 Z"
              fill="url(#leafGrad)"
              stroke="#B69BFF"
              strokeOpacity="0.4"
              strokeWidth="0.4"
            />
          </G>
        ))}
      </Svg>

      <Text style={[styles.laurelHash, { fontFamily: titleFont }]}>#1</Text>
    </View>
  );
}

function PlanCard({
  active,
  label,
  sublabel,
  badge,
  discount,
  titleFont,
  onPress,
}: {
  active: boolean;
  label: string;
  sublabel?: string;
  badge?: string;
  discount?: string;
  titleFont: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.planCard, active && styles.planCardActive]}
    >
      {discount && (
        <View style={styles.discountBanner}>
          <LinearGradient
            colors={["#1A0F3D", "#0A0418"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.discountBannerFill}
          >
            <Text style={styles.discountBannerText}>{discount}</Text>
          </LinearGradient>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={[styles.planLabel, { fontFamily: titleFont }]}>
          {label}
        </Text>
        {sublabel && <Text style={styles.planSublabel}>{sublabel}</Text>}
      </View>

      {badge && (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkDot}>
        <Text style={styles.checkText}>✓</Text>
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function FakeResultRow() {
  return (
    <View style={styles.fakeRow}>
      <View style={styles.fakeDot} />
      <View>
        <View style={styles.fakeLineOne} />
        <View style={styles.fakeLineTwo} />
      </View>
    </View>
  );
}

function CosmicGlow() {
  return (
    <View pointerEvents="none" style={styles.cosmicWrap}>
      <Svg width={width} height={360} viewBox={`0 0 ${width} 360`}>
        <Defs>
          <SvgLinearGradient id="arcGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7C3AED" stopOpacity="0.05" />
            <Stop offset="0.55" stopColor="#B69BFF" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="softFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#A78BFA" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        <Ellipse
          cx={width / 2}
          cy={-130}
          rx={width * 0.72}
          ry={250}
          fill="url(#softFill)"
        />

        <Path
          d={`M ${-40} 132 C ${90} 260, ${width - 90} 260, ${
            width + 40
          } 132`}
          stroke="url(#arcGlow)"
          strokeWidth="2"
          fill="none"
        />

        <Path
          d={`M ${-40} 132 C ${90} 260, ${width - 90} 260, ${
            width + 40
          } 132`}
          stroke="#B69BFF"
          strokeOpacity="0.24"
          strokeWidth="18"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function SkinScanIcon() {
  return (
    <Svg width={116} height={116} viewBox="0 0 116 116">
      <Defs>
        <SvgLinearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B69BFF" stopOpacity="1" />
          <Stop offset="1" stopColor="#7C3AED" stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>

      <Circle cx="58" cy="58" r="54" fill="#120A24" stroke="#8B5CF6" strokeOpacity="0.28" />
      <Path
        d="M35 63c6-23 28-31 46-18-8 4-13 12-13 22 0 6 2 12 6 16-18 6-39-1-39-20Z"
        fill="none"
        stroke="url(#scanGrad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Path
        d="M30 38h18M30 38v18M86 38H68M86 38v18M30 78h18M30 78V60M86 78H68M86 78V60"
        stroke="#B69BFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <Circle cx="72" cy="56" r="3" fill="#B69BFF" />
    </Svg>
  );
}

function RoutineIcon() {
  return (
    <Svg width={54} height={54} viewBox="0 0 54 54">
      <Rect
        x="7"
        y="7"
        width="40"
        height="40"
        rx="14"
        fill="#120A24"
        stroke="#8B5CF6"
        strokeOpacity="0.35"
      />
      <Path
        d="M18 21h18M18 28h13M18 35h16"
        stroke="#B69BFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LockIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <G>
        <Path
          d="M22 31v-7c0-8 6-14 14-14s14 6 14 14v7"
          fill="none"
          stroke="#B69BFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Rect
          x="16"
          y="31"
          width="40"
          height="31"
          rx="7"
          fill="none"
          stroke="#B69BFF"
          strokeWidth="4"
        />
        <Path
          d="M36 45v8"
          stroke="#B69BFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Circle cx="36" cy="43" r="4" fill="#B69BFF" />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  cosmicWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  backButton: {
    position: "absolute",
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    zIndex: 10,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  progressRow: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 8,
    marginBottom: 52,
  },
  progressDot: {
    width: 28,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  progressDotActive: {
    backgroundColor: "#B69BFF",
  },
  step: {
    flex: 1,
    alignItems: "center",
  },
  heroIconWrap: {
    marginBottom: 26,
    shadowColor: "#A78BFA",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    fontSize: 42,
    lineHeight: 50,
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.8,
    marginBottom: 18,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 20,
    lineHeight: 29,
    color: "rgba(255,255,255,0.58)",
    textAlign: "center",
    maxWidth: 330,
    marginBottom: 34,
  },
  scoreCard: {
    width: "100%",
    height: 210,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.28)",
    backgroundColor: "rgba(20,12,40,0.64)",
    padding: 22,
    marginBottom: 28,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardEyebrow: {
    fontFamily: Fonts.bold,
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  lockMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(182,155,255,0.08)",
  },
  blurredLineWide: {
    width: "72%",
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop: 34,
  },
  blurredLine: {
    width: "58%",
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.09)",
    marginTop: 16,
  },
  blurredLineSmall: {
    width: "42%",
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginTop: 16,
  },
  issuePill: {
    position: "absolute",
    right: 22,
    bottom: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,79,109,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,112,139,0.35)",
  },
  issuePillText: {
    fontFamily: Fonts.bold,
    color: "#FF8FA3",
    fontSize: 16,
  },
  benefitList: {
    width: "100%",
    gap: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.18)",
  },
  checkDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(182,155,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkText: {
    color: "#B69BFF",
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  benefitText: {
    flex: 1,
    color: "rgba(255,255,255,0.78)",
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  planStack: {
    width: "100%",
    gap: 14,
    marginTop: 8,
    marginBottom: 0,
  },
  socialProofWrap: {
    alignItems: "center",
    marginTop: 0,
    marginBottom: 0,
  },
  laurelWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  laurelHash: {
    position: "absolute",
    fontSize: 56,
    color: "#fff",
    letterSpacing: -1,
    top: 28,
    textShadowColor: "rgba(124,58,237,0.85)",
    textShadowRadius: 18,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  starGlyph: {
    color: "#B69BFF",
    fontSize: 18,
    textShadowColor: "rgba(124,58,237,0.7)",
    textShadowRadius: 10,
  },
  socialProofText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.2,
    marginTop: 4,
  },
  planCard: {
    minHeight: 96,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.22)",
    backgroundColor: "rgba(255,255,255,0.025)",
    paddingVertical: 20,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  planCardActive: {
    borderColor: "#B69BFF",
    borderWidth: 1.5,
    backgroundColor: "rgba(91,63,184,0.14)",
  },
  radioOuter: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#B69BFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#B69BFF",
  },
  planLabel: {
    color: "#fff",
    fontSize: 28,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  planSublabel: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    maxWidth: 200,
  },
  planBadge: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(91,63,184,0.55)",
  },
  discountBanner: {
    position: "absolute",
    top: -11,
    right: 18,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(182,155,255,0.45)",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  discountBannerFill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  discountBannerText: {
    color: "#E9DDFF",
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  planBadgeText: {
    color: "#C4B5FD",
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  previewBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.22)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  previewTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  previewTitle: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 17,
    marginBottom: 5,
  },
  previewText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  lockedResultCard: {
    width: "100%",
    height: 280,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.28)",
    backgroundColor: "rgba(20,12,40,0.66)",
    marginBottom: 28,
  },
  fakeRows: {
    position: "absolute",
    left: 24,
    top: 38,
    gap: 28,
    opacity: 0.5,
  },
  fakeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fakeDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(182,155,255,0.35)",
    marginRight: 18,
    shadowColor: "#B69BFF",
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  fakeLineOne: {
    width: 160,
    height: 15,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  fakeLineTwo: {
    width: 112,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  bigLockWrap: {
    position: "absolute",
    right: 36,
    top: 58,
    alignItems: "center",
  },
  issuePillFinal: {
    marginTop: 28,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,79,109,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,112,139,0.35)",
  },
  sparkle: {
    color: "#B69BFF",
    fontSize: 32,
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "#B69BFF",
    textShadowRadius: 18,
  },
  unlockText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: Fonts.regular,
    fontSize: 22,
    lineHeight: 31,
    textAlign: "center",
    marginBottom: 24,
  },
  trialCard: {
    width: "100%",
    padding: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.18)",
    alignItems: "center",
  },
  trialTitle: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 18,
    marginBottom: 5,
  },
  trialText: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  bottomArea: {
    width: "100%",
    marginTop: 18,
    paddingTop: 0,
  },
  primaryButton: {
    width: "100%",
    height: 64,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  primaryButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: "#000",
    fontFamily: Fonts.bold,
    fontSize: 25,
    letterSpacing: -0.4,
  },
  primaryButtonWelcome: {
    backgroundColor: "#5B3FB8",
    shadowColor: "#4C1D95",
    shadowOpacity: 0.7,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryButtonHeroShell: {
    width: "100%",
    height: 64,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#5B3FB8",
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
  },
  primaryButtonHeroFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  primaryButtonTextWelcome: {
    color: "#fff",
  },
  footerText: {
    color: "rgba(255,255,255,0.44)",
    fontFamily: Fonts.regular,
    fontSize: 16,
    textAlign: "center",
    marginTop: 17,
  },
  welcomeStep: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  welcomeStepStatic: {
    flex: 0,
  },
  premiumAuraWrap: {
    position: "absolute",
    top: -40,
    left: -24,
    right: -24,
    height: 420,
  },
  welcomeLogoWrap: {
    marginTop: 24,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  welcomeLogo: {
    fontSize: 56,
    color: "#B69BFF",
    fontStyle: "italic",
    letterSpacing: -1,
    textShadowColor: "rgba(124,58,237,1)",
    textShadowRadius: 42,
    textShadowOffset: { width: 0, height: 0 },
  },
  welcomeLogoWrapSmall: {
    marginTop: 8,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.9,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  welcomeLogoSmall: {
    fontSize: 36,
    color: "#fff",
    fontStyle: "italic",
    letterSpacing: -0.6,
    textShadowColor: "rgba(124,58,237,0.95)",
    textShadowRadius: 26,
    textShadowOffset: { width: 0, height: 0 },
  },
  planSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 17,
    lineHeight: 25,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    marginBottom: 34,
    maxWidth: 340,
  },
  welcomeTitle: {
    fontSize: 42,
    lineHeight: 50,
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.8,
    marginBottom: 28,
  },
  welcomeParagraph: {
    fontFamily: Fonts.regular,
    fontSize: 17,
    lineHeight: 26,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    marginBottom: 22,
    maxWidth: 340,
  },
  welcomeSignature: {
    fontSize: 22,
    color: "#8B6BD9",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 18,
    paddingHorizontal: 16,
  },
  legalLink: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: Fonts.regular,
    fontSize: 17,
  },
  skinXMark: {
    fontSize: 15,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: -8,
    marginBottom: 8,
  },
  welcomeTitleCompact: {
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 12,
  },
  planSubtitleCompact: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  benefitStack: {
    width: "100%",
    gap: 10,
    marginTop: 2,
    marginBottom: 14,
  },
  benefitCardOuter: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.32)",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  benefitCardFill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.65)",
    shadowColor: "#B69BFF",
    shadowOpacity: 0.85,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  benefitIconInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    color: "#fff",
    fontSize: 19,
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  benefitDesc: {
    color: "rgba(255,255,255,0.62)",
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  pillsRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  trialPillOuter: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.55)",
  },
  trialPillFill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trialPillText: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  finalTitle: {
    fontSize: 21,
    lineHeight: 26,
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.3,
    marginTop: 2,
    marginBottom: 4,
  },
  finalPriceLine: {
    color: "rgba(255,255,255,0.62)",
    fontFamily: Fonts.regular,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 0,
  },
});
