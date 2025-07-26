import React, { useState, useEffect } from 'react';
import {
  BoltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckIcon,
  ArrowRightIcon,
  PlayIcon,
  StarIcon,
  LightBulbIcon,
  CpuChipIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface LandingPageProps {
  onNavigateToAuth?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    if (onNavigateToAuth) {
      onNavigateToAuth();
    } else {
      // Fallback navigation
      window.history.pushState(null, '', '/auth');
      window.location.reload();
    }
  };

  const features = [
    {
      icon: CpuChipIcon,
      title: "AI-Powered Intelligence",
      description: "Smart alert deduplication and automated incident classification with 99.5% accuracy."
    },
    {
      icon: ClockIcon,
      title: "Lightning Fast Response",
      description: "Average 30-second alert processing with intelligent escalation and routing."
    },
    {
      icon: ShieldCheckIcon,
      title: "Enterprise Security",
      description: "SOC 2 compliant with end-to-end encryption and advanced audit logging."
    },
    {
      icon: UserGroupIcon,
      title: "Smart Team Management",
      description: "Skill-based routing and automated on-call scheduling with fairness algorithms."
    },
    {
      icon: GlobeAltIcon,
      title: "Universal Integrations",
      description: "Connect 50+ monitoring tools and communication platforms out of the box."
    },
    {
      icon: ChartBarIcon,
      title: "Advanced Analytics",
      description: "Real-time insights and predictive analytics to prevent incidents before they happen."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "VP Engineering, TechCorp",
      company: "TechCorp",
      image: "👩‍💻",
      quote: "OnCall AI reduced our MTTR by 73% and eliminated alert fatigue. It's like having a senior SRE working 24/7.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "CTO, ScaleUp Inc",
      company: "ScaleUp Inc",
      image: "👨‍💼", 
      quote: "The AI-powered incident classification is incredible. We went from 200 alerts/day to 12 actionable incidents.",
      rating: 5
    },
    {
      name: "Priya Patel",
      role: "DevOps Lead, CloudTech",
      company: "CloudTech",
      image: "👩‍🔬",
      quote: "Setup took 10 minutes. Within a week, our on-call stress dropped 80%. The team actually enjoys being on-call now.",
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "per user/month",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 10 team members",
        "100 incidents/month",
        "Basic integrations",
        "Email & SMS alerts",
        "Community support"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Professional", 
      price: "$99",
      period: "per user/month",
      description: "Advanced features for growing teams",
      features: [
        "Unlimited team members",
        "Unlimited incidents", 
        "All integrations",
        "AI-powered routing",
        "Advanced analytics",
        "Priority support",
        "Custom runbooks"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact sales",
      description: "Tailored solutions for large organizations",
      features: [
        "Everything in Professional",
        "Custom integrations",
        "Dedicated CSM",
        "SLA guarantees",
        "Advanced security",
        "Training & onboarding"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const stats = [
    { label: "Average MTTR Reduction", value: "73%", icon: "⚡" },
    { label: "Alert Noise Reduction", value: "89%", icon: "🔕" },
    { label: "Customer Satisfaction", value: "4.9/5", icon: "⭐" },
    { label: "Enterprise Clients", value: "500+", icon: "🏢" }
  ];

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 glass-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BoltIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">OnCall AI</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Customers</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Docs</a>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={handleGetStarted}
                className="text-gray-300 hover:text-white transition-colors px-4 py-2"
              >
                Sign In
              </button>
              <button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-xl transition-all duration-200 font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium mb-8 border border-blue-500/30">
              <LightBulbIcon className="w-4 h-4 mr-2" />
              AI-Powered Incident Response • Trusted by 500+ Companies
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              Stop Fighting
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Alerts.</span>
              <br />
              Start Solving
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Incidents.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              OnCall AI transforms chaos into clarity with intelligent incident response. 
              Reduce alert fatigue by 89% and cut MTTR by 73% with AI that thinks like your best SRE.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
              <button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              
              <button className="flex items-center space-x-3 text-white hover:text-blue-300 transition-colors px-8 py-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <PlayIcon className="w-5 h-5 ml-1" />
                </div>
                <span className="text-lg font-medium">Watch Demo</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Built for the Future of
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Incident Response</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Every feature designed to eliminate toil and amplify your team's expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card rounded-2xl p-8 hover:scale-105 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Loved by Teams
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Worldwide</span>
            </h2>
            <p className="text-xl text-gray-300">See how OnCall AI transformed incident response for these companies</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="glass-card rounded-2xl p-8 lg:p-12 text-center">
              <div className="flex justify-center mb-6">
                {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                  <StarIcon key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <blockquote className="text-2xl lg:text-3xl text-white font-medium mb-8 leading-relaxed">
                "{testimonials[activeTestimonial].quote}"
              </blockquote>
              
              <div className="flex items-center justify-center space-x-4">
                <div className="text-4xl">{testimonials[activeTestimonial].image}</div>
                <div className="text-left">
                  <div className="text-lg font-semibold text-white">{testimonials[activeTestimonial].name}</div>
                  <div className="text-gray-300">{testimonials[activeTestimonial].role}</div>
                  <div className="text-blue-400">{testimonials[activeTestimonial].company}</div>
                </div>
              </div>
            </div>

            {/* Testimonial Navigation */}
            <div className="flex justify-center space-x-3 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-blue-500' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Simple, Transparent
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-xl text-gray-300">Choose the plan that fits your team's needs</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`glass-card rounded-2xl p-8 relative ${
                  plan.popular ? 'border-2 border-blue-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-300 mb-6">{plan.description}</p>
                  <div className="text-4xl font-bold text-white mb-2">
                    {plan.price}
                    {plan.price !== "Custom" && <span className="text-lg text-gray-300">/{plan.period}</span>}
                  </div>
                  {plan.price === "Custom" && <div className="text-gray-300">{plan.period}</div>}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleGetStarted}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card rounded-2xl p-12 lg:p-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Incident Response?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join 500+ companies already using OnCall AI to eliminate alert fatigue and reduce MTTR
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Start Your Free Trial
              </button>
              <p className="text-gray-400 text-sm">No credit card required • 14-day free trial</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BoltIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">OnCall AI</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 OnCall AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;