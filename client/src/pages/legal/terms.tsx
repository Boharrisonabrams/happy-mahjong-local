import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Terms() {
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
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-serif font-bold">Terms of Service</h1>
          </div>
          
          <p className="text-muted-foreground mb-2">
            Last updated: {format(lastUpdated, 'MMMM d, yyyy')}
          </p>
        </div>

        <Card className="p-8 prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using MahjongMaster ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              These Terms of Service ("Terms") govern your use of our online American Mahjong gaming platform.
            </p>
            <p className="mb-4">
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="mb-4">
              MahjongMaster provides an online platform for playing American Mahjong with other users or AI opponents. 
              Our services include:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Multiplayer American Mahjong games</li>
              <li>AI opponent gameplay</li>
              <li>Interactive tutorials and learning materials</li>
              <li>Daily puzzle challenges</li>
              <li>User profiles and statistics</li>
              <li>Chat and social features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="mb-4">
              To access certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized account access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Use automated systems or bots to play games</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Distribute spam, malware, or harmful content</li>
              <li>Infringe on intellectual property rights</li>
              <li>Engage in any form of cheating or unfair play</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Game Rules and Conduct</h2>
            <p className="mb-4">
              All gameplay must follow official American Mahjong rules as implemented in our system. 
              Players are expected to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Play fairly and respectfully</li>
              <li>Not collude with other players</li>
              <li>Report suspicious behavior or rule violations</li>
              <li>Accept decisions made by our automated game systems</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Privacy and Data</h2>
            <p className="mb-4">
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. 
              By using the Service, you consent to the collection and use of information as described in our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p className="mb-4">
              The Service and its original content, features, and functionality are owned by MahjongMaster and are protected by 
              international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Subscriptions and Payments</h2>
            <p className="mb-4">
              Some features of the Service may require payment. Subscription terms include:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Payments are processed securely through third-party providers</li>
              <li>Subscriptions automatically renew unless cancelled</li>
              <li>Refunds are subject to our refund policy</li>
              <li>We reserve the right to change pricing with notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account and access to the Service at our sole discretion, without prior notice, 
              for conduct that we believe violates these Terms or is harmful to other users or the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
            <p className="mb-4">
              The Service is provided "as is" without any representations or warranties. We make no warranties regarding the 
              availability, reliability, or functionality of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="mb-4">
              In no event shall MahjongMaster be liable for any indirect, incidental, special, or consequential damages arising 
              out of or in connection with your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes via email 
              or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p><strong>Email:</strong> legal@mahjongmaster.com</p>
              <p><strong>Address:</strong> MahjongMaster Legal Department<br />
              123 Game Street<br />
              San Francisco, CA 94102</p>
            </div>
          </section>
        </Card>

        {/* Footer Actions */}
        <div className="mt-8 text-center">
          <Link href="/legal/privacy">
            <Button variant="outline" className="mr-4">
              <FileText className="h-4 w-4 mr-2" />
              Privacy Policy
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
