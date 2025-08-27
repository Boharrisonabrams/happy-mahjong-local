import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Eye, Database, Cookie } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Privacy() {
  const lastUpdated = new Date('2024-01-01');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4" data-testid="back-button">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-serif font-bold">Privacy Policy</h1>
          </div>
          
          <p className="text-muted-foreground mb-2">
            Last updated: {format(lastUpdated, 'MMMM d, yyyy')}
          </p>
        </div>

        <Card className="p-8 prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              MahjongMaster ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we 
              collect, use, disclose, and safeguard your information when you use our online American Mahjong gaming platform.
            </p>
            <p className="mb-4">
              By using our Service, you consent to the data practices described in this policy.
            </p>
          </section>

          <section className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
            </div>
            
            <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
            <p className="mb-4">We may collect the following personal information:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Name and email address when you create an account</li>
              <li>Profile information you choose to provide</li>
              <li>Payment information for subscriptions (processed by third parties)</li>
              <li>Communications you send to us</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3">Gameplay Information</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Game statistics and performance data</li>
              <li>Chat messages and social interactions</li>
              <li>Tutorial progress and learning achievements</li>
              <li>Puzzle completion times and scores</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3">Technical Information</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and operating system</li>
              <li>Usage patterns and session data</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
            </div>
            
            <p className="mb-4">We use the collected information for:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Providing and maintaining our gaming service</li>
              <li>Creating and managing user accounts</li>
              <li>Facilitating multiplayer gameplay and matchmaking</li>
              <li>Tracking game progress and achievements</li>
              <li>Providing customer support and responding to inquiries</li>
              <li>Improving our service through analytics</li>
              <li>Sending important service updates and notifications</li>
              <li>Preventing fraud and ensuring fair play</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="mb-4">We do not sell your personal information. We may share information in these circumstances:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>With other players:</strong> Username, game statistics, and chat messages during gameplay</li>
              <li><strong>Service providers:</strong> Third-party companies that help us operate our service</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            </ul>
          </section>

          <section className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Cookie className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">5. Cookies and Tracking</h2>
            </div>
            
            <p className="mb-4">We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Remember your login status and preferences</li>
              <li>Analyze site usage and improve performance</li>
              <li>Provide personalized gaming experiences</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
            <p className="mb-4">
              You can control cookie settings through your browser, but disabling cookies may affect service functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="mb-4">We implement appropriate security measures to protect your information, including:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication systems</li>
              <li>Secure payment processing through certified providers</li>
            </ul>
            <p className="mb-4">
              However, no internet transmission is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Privacy Rights</h2>
            <p className="mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Access:</strong> Request information about data we collect and store</li>
              <li><strong>Correction:</strong> Update or correct inaccurate personal information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive a copy of your data in a structured format</li>
              <li><strong>Opt-out:</strong> Disable analytics collection in your profile settings</li>
            </ul>
            <p className="mb-4">
              To exercise these rights, contact us at privacy@mahjongmaster.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="mb-4">
              Our service is intended for users 13 years and older. We do not knowingly collect personal information from 
              children under 13. If we become aware of such collection, we will delete the information promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. International Users</h2>
            <p className="mb-4">
              Our service is operated from the United States. If you use our service from other countries, your information 
              may be transferred to and processed in the United States, which may have different privacy laws than your country.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Third-Party Services</h2>
            <p className="mb-4">
              Our service may contain links to third-party websites or integrate with external services. We are not responsible 
              for the privacy practices of these third parties. We encourage you to review their privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Data Retention</h2>
            <p className="mb-4">
              We retain your information for as long as necessary to provide our service and comply with legal obligations. 
              Game statistics and achievements may be retained longer to maintain leaderboards and historical records.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy periodically. We will notify you of significant changes via email or through 
              our service. The "Last Updated" date at the top reflects the most recent version.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p><strong>Email:</strong> privacy@mahjongmaster.com</p>
              <p><strong>Address:</strong> MahjongMaster Privacy Team<br />
              123 Game Street<br />
              San Francisco, CA 94102</p>
              <p><strong>Phone:</strong> 1-800-MAHJONG</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. California Privacy Rights</h2>
            <p className="mb-4">
              California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to 
              know what personal information is collected, the right to delete personal information, and the right to opt-out of 
              the sale of personal information.
            </p>
            <p className="mb-4">
              <strong>Note:</strong> We do not sell personal information as defined by the CCPA.
            </p>
          </section>
        </Card>

        {/* Footer Actions */}
        <div className="mt-8 text-center">
          <Link href="/legal/terms">
            <Button variant="outline" className="mr-4">
              Terms of Service
            </Button>
          </Link>
          <Link href="/">
            <Button>
              Return to Game
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
