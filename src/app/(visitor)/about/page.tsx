import Link from "next/link";
import { Stethoscope, Clock, Shield, Users, Phone, Star, ChevronLeft, Heart, Zap, Globe } from "lucide-react";
import { KioskLayout, AfyaLogo } from "@/components/shared/KioskLayout";

const services = [
  {
    icon: Stethoscope,
    title: "Doctor Consultations",
    description: "Connect with qualified, licensed doctors via video or phone calls. Available 7 days a week.",
    color: "bg-afya-500",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Our doctors are available around the clock, even on public holidays and weekends.",
    color: "bg-blue-500",
  },
  {
    icon: Shield,
    title: "Health Records",
    description: "Secure, digital health records accessible anytime. Your medical history, prescriptions, and more.",
    color: "bg-purple-500",
  },
  {
    icon: Heart,
    title: "Chronic Disease Management",
    description: "Ongoing support for diabetes, hypertension, asthma, and other chronic conditions.",
    color: "bg-red-500",
  },
  {
    icon: Zap,
    title: "Fast Prescriptions",
    description: "Get digital prescriptions sent directly to your phone after your consultation.",
    color: "bg-orange-500",
  },
  {
    icon: Globe,
    title: "Nationwide Coverage",
    description: "Available across Tanzania — urban and rural. All you need is a mobile phone.",
    color: "bg-teal-500",
  },
];

const plans = [
  {
    name: "Basic",
    price: "TSh 5,000",
    period: "/month",
    features: ["2 consultations/month", "Digital prescriptions", "Health records"],
    color: "border-gray-200",
    highlight: false,
  },
  {
    name: "Family",
    price: "TSh 15,000",
    period: "/month",
    features: ["Unlimited consultations", "5 family members", "Priority queue", "Specialist referrals"],
    color: "border-afya-500",
    highlight: true,
  },
  {
    name: "Corporate",
    price: "Custom",
    period: "",
    features: ["Full team coverage", "Dedicated account manager", "Analytics dashboard", "API access"],
    color: "border-gray-200",
    highlight: false,
  },
];

export default function AboutPage() {
  return (
    <KioskLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-6 pt-10 pb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <AfyaLogo size="md" />
              <Link
                href="/"
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Home
              </Link>
            </div>

            <div className="text-center">
              <h1 className="text-4xl font-black text-white mb-3">
                Healthcare for Everyone
              </h1>
              <p className="text-afya-200 text-lg max-w-md mx-auto leading-relaxed">
                AfyaCall brings qualified doctors to your fingertips — anytime, anywhere in Tanzania.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "50K+", label: "Patients Served" },
                { value: "200+", label: "Doctors" },
                { value: "4.8★", label: "App Rating" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                  <div className="text-3xl font-black text-white">{stat.value}</div>
                  <div className="text-afya-200 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="px-6 mb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Our Services</h2>
            <div className="grid grid-cols-1 gap-3">
              {services.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="bg-white rounded-2xl p-5 flex items-start gap-4">
                    <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{s.title}</h3>
                      <p className="text-gray-500 text-sm mt-1 leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 mb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Subscription Plans</h2>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-white rounded-2xl p-5 border-2 ${plan.color} ${plan.highlight ? "shadow-xl shadow-afya-500/20" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-lg">{plan.name}</span>
                        {plan.highlight && (
                          <span className="flex items-center gap-1 bg-afya-100 text-afya-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3" /> Most Popular
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-afya-600">{plan.price}</span>
                      <span className="text-gray-400 text-sm">{plan.period}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-afya-100 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-afya-500" />
                        </div>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="px-6 pb-10">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 text-center">
              <Users className="w-10 h-10 text-white mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Ready to Get Started?</h3>
              <p className="text-afya-200 text-sm mb-6">
                Speak to one of our booth attendants or register online
              </p>
              <div className="flex items-center justify-center gap-3 text-white">
                <Phone className="w-5 h-5" />
                <span className="font-bold text-lg">0800 AFYACALL</span>
              </div>
              <p className="text-afya-300 text-xs mt-2">Toll-free within Tanzania</p>
            </div>
          </div>
        </div>
      </div>
    </KioskLayout>
  );
}
