import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Colors, Fonts } from '@/lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Last updated May 03, 2026</Text>

          <Section title="1. WHAT INFORMATION DO WE COLLECT?">
            <Body>
              We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
            </Body>
            <Body bold>Personal information we collect may include:</Body>
            <Bullet>Names</Bullet>
            <Bullet>Email addresses</Bullet>
            <Bullet>Phone numbers</Bullet>
            <Bullet>Passwords</Bullet>
            <Bullet>Debit/credit card numbers</Bullet>
            <Body bold>Application Data.</Body>
            <Body>
              If you use our application(s), we also may collect the following information if you choose to provide us with access or permission:
            </Body>
            <Bullet>
              <Text style={styles.italic}>Mobile Device Access. </Text>We may request access or permission to certain features from your mobile device, including your mobile device's camera, and other features.
            </Bullet>
            <Bullet>
              <Text style={styles.italic}>Push Notifications. </Text>We may request to send you push notifications regarding your account or certain features of the application(s). You may turn them off in your device's settings.
            </Bullet>
          </Section>

          <Section title="2. HOW DO WE PROCESS YOUR INFORMATION?">
            <Body>
              We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes only with your prior explicit consent.
            </Body>
            <Bullet>
              <Text style={styles.bold}>To facilitate account creation and authentication</Text> and otherwise manage user accounts.
            </Bullet>
            <Bullet>
              <Text style={styles.bold}>To save or protect an individual's vital interest</Text>, such as to prevent harm.
            </Bullet>
          </Section>

          <Section title="3. WHAT LEGAL BASES DO WE RELY ON?">
            <Body>
              We only process your personal information when we have a valid legal reason to do so under applicable law. We may rely on:
            </Body>
            <Bullet><Text style={styles.bold}>Consent</Text> – you have given us permission for a specific purpose. You can withdraw consent at any time.</Bullet>
            <Bullet><Text style={styles.bold}>Legal Obligations</Text> – compliance with law enforcement or regulatory requirements.</Bullet>
            <Bullet><Text style={styles.bold}>Vital Interests</Text> – to protect your vital interests or those of a third party.</Bullet>
          </Section>

          <Section title="4. WHEN AND WITH WHOM DO WE SHARE YOUR INFORMATION?">
            <Body>We may need to share your personal information in the following situations:</Body>
            <Bullet><Text style={styles.bold}>Business Transfers.</Text> In connection with any merger, sale, financing, or acquisition of our business.</Bullet>
            <Bullet><Text style={styles.bold}>Google Maps Platform APIs.</Text> We may share your information with certain Google Maps Platform APIs.</Bullet>
            <Bullet><Text style={styles.bold}>Business Partners.</Text> To offer you certain products, services, or promotions.</Bullet>
          </Section>

          <Section title="5. THIRD-PARTY WEBSITES">
            <Body>
              The Services may link to third-party websites, online services, or mobile applications. We are not responsible for the content, privacy, or security practices of any third parties. You should review their policies directly.
            </Body>
          </Section>

          <Section title="6. COOKIES AND TRACKING TECHNOLOGIES">
            <Body>
              We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising.
            </Body>
          </Section>

          <Section title="7. ARTIFICIAL INTELLIGENCE-BASED PRODUCTS">
            <Body>
              We offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies ("AI Products"). We provide the AI Products through third-party service providers, including Google Cloud AI.
            </Body>
            <Body>
              Our AI Products are designed for AI insights. All personal information processed using our AI Products is handled in line with this Privacy Notice.
            </Body>
          </Section>

          <Section title="8. SOCIAL LOGINS">
            <Body>
              Our Services offer you the ability to register and log in using your third-party social media account details (like Facebook or X logins). We will receive certain profile information about you from your social media provider, including your name, email address, and profile picture.
            </Body>
          </Section>

          <Section title="9. HOW LONG DO WE KEEP YOUR INFORMATION?">
            <Body>
              We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice. No purpose in this notice will require us keeping your personal information for longer than three (3) months past the termination of the user's account.
            </Body>
          </Section>

          <Section title="10. HOW DO WE KEEP YOUR INFORMATION SAFE?">
            <Body>
              We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
            </Body>
          </Section>

          <Section title="11. YOUR PRIVACY RIGHTS">
            <Body>
              Depending on your location (including the EEA, UK, Switzerland, Canada, and certain US states), you may have rights including:
            </Body>
            <Bullet>Right to access your personal data</Bullet>
            <Bullet>Right to correct inaccuracies</Bullet>
            <Bullet>Right to request deletion of your personal data</Bullet>
            <Bullet>Right to withdraw consent at any time</Bullet>
            <Bullet>Right to non-discrimination for exercising your rights</Bullet>
            <Body>
              To exercise these rights, email us at skinxtechnologies@gmail.com or submit a data subject access request at https://app.termly.io/dsar/6b9a84e6-9221-4caf-a07f-24602f5f9f30
            </Body>
          </Section>

          <Section title="12. DO-NOT-TRACK FEATURES">
            <Body>
              We do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.
            </Body>
          </Section>

          <Section title="15. UPDATES TO THIS NOTICE">
            <Body>
              We may update this Privacy Notice from time to time. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.
            </Body>
          </Section>

          <Section title="16. CONTACT US">
            <Body>SkinX Technologies LLC</Body>
            <Body>499 W Portola Ave</Body>
            <Body>Los Altos, CA 94022</Body>
            <Body>United States</Body>
            <Body>Email: skinxtechnologies@gmail.com</Body>
          </Section>

          <Text style={styles.footer}>
            This Privacy Policy was created using Termly's Privacy Policy Generator.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return <Text style={[styles.body, bold && styles.bold]}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    fontFamily: Fonts.semiBold,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 17,
    color: Colors.primary,
    fontFamily: Fonts.medium,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 13,
    color: '#595959',
    lineHeight: 20,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  italic: {
    fontStyle: 'italic',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 13,
    color: '#595959',
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#595959',
    lineHeight: 20,
  },
  footer: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 20,
    textAlign: 'center',
  },
});
