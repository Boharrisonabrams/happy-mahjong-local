import { Link } from "wouter";

export function Footer() {
  const footerSections = [
    {
      title: "Game",
      links: [
        { href: "/play", label: "Play Now" },
        { href: "/learn", label: "Tutorials" },
        { href: "/puzzle", label: "Daily Puzzle" },
        { href: "/profile", label: "Settings" }
      ]
    },
    {
      title: "Community", 
      links: [
        { href: "#", label: "Discord" },
        { href: "#", label: "Forums" },
        { href: "/shop", label: "Shop" },
        { href: "#", label: "Support" }
      ]
    },
    {
      title: "Legal",
      links: [
        { href: "/legal/terms", label: "Terms of Service" },
        { href: "/legal/privacy", label: "Privacy Policy" },
        { href: "#", label: "DMCA" },
        { href: "#", label: "Contact" }
      ]
    }
  ];

  const socialLinks = [
    { href: "#", icon: "fab fa-twitter", label: "Twitter" },
    { href: "#", icon: "fab fa-facebook", label: "Facebook" },  
    { href: "#", icon: "fab fa-youtube", label: "YouTube" }
  ];

  return (
    <footer className="bg-muted py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-primary-foreground rounded-sm"></div>
                  <div className="bg-primary-foreground rounded-sm"></div>
                  <div className="bg-primary-foreground rounded-sm"></div>
                  <div className="bg-primary-foreground rounded-sm"></div>
                </div>
              </div>
              <span className="text-xl font-serif font-bold text-primary">MahjongMaster</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              The premier destination for American Mahjong online. Play, learn, and master the game with players worldwide.
            </p>
          </div>

          {/* Footer sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.links.map((link, index) => (
                  <li key={`${section.title}-${index}`}>
                    <Link 
                      href={link.href} 
                      className="hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2024 MahjongMaster. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {socialLinks.map((social, index) => (
              <a
                key={`social-${index}`}
                href={social.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={social.label}
              >
                <i className={social.icon}></i>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
