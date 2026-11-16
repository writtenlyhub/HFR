"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Layout,
  Sparkles,
  MessageSquare,
  HelpCircle,
  MapPin,
  Share2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Eye,
  RotateCcw,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Upload,
  ExternalLink,
  ChevronRight,
  Star,
  Check,
  X,
  Lock,
  Building,
  Info,
  FolderOpen,
} from "lucide-react";
import { MediaPickerModal } from "@/components/admin/media-picker-modal";
import {
  saveSectionDraftAction,
  publishSectionAction,
  unpublishSectionAction,
  discardSectionDraftAction,
  createTestimonialAction,
  updateTestimonialAction,
  deleteTestimonialAction,
  reorderTestimonialsAction,
  createFaqAction,
  updateFaqAction,
  deleteFaqAction,
  reorderFaqsAction,
  createExperienceAction,
  updateExperienceAction,
  deleteExperienceAction,
  reorderExperiencesAction,
  uploadContentImageAction,
} from "./content-actions";
import type {
  HomepageHeroContent,
  FeaturedAccommodationsContent,
  HomepageAboutContent,
  ContactInfoContent,
  SocialMediaContent,
  GlobalSeoContent,
} from "@/lib/content/content-service";

interface SectionMeta {
  sectionKey: string;
  isPublished: boolean;
  hasDraft: boolean;
  lastPublishedAt: Date | string | null;
  lastEditedBy: string | null;
  updatedAt: Date | string;
}

interface TestimonialItem {
  id: string;
  guestName: string;
  location: string | null;
  stayType: string | null;
  reviewText: string;
  rating: number;
  guestImageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
}

interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isPublished: boolean;
}

interface ExperienceRecord {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  imageUrl: string | null;
  iconName: string | null;
  category: string | null;
  sortOrder: number;
  isPublished: boolean;
}

interface PropertyOption {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
}

interface ContentManagementViewProps {
  overview: {
    sections: SectionMeta[];
    testimonialsCount: number;
    faqsCount: number;
    experiencesCount: number;
  };
  initialHero: {
    live: HomepageHeroContent;
    preview: HomepageHeroContent;
    meta: SectionMeta;
  };
  initialFeatured: {
    live: FeaturedAccommodationsContent;
    preview: FeaturedAccommodationsContent;
    meta: SectionMeta;
  };
  initialAbout: {
    live: HomepageAboutContent;
    preview: HomepageAboutContent;
    meta: SectionMeta;
  };
  initialContact: {
    live: ContactInfoContent;
    preview: ContactInfoContent;
    meta: SectionMeta;
  };
  initialSocial: {
    live: SocialMediaContent;
    preview: SocialMediaContent;
    meta: SectionMeta;
  };
  initialSeo: {
    live: GlobalSeoContent;
    preview: GlobalSeoContent;
    meta: SectionMeta;
  };
  initialTestimonials: TestimonialItem[];
  initialFaqs: FaqRecord[];
  initialExperiences: ExperienceRecord[];
  properties: PropertyOption[];
}

type TabType =
  | "overview"
  | "hero"
  | "featured"
  | "about"
  | "experiences"
  | "testimonials"
  | "faqs"
  | "contact"
  | "social"
  | "seo";

export function ContentManagementView({
  overview,
  initialHero,
  initialFeatured,
  initialAbout,
  initialContact,
  initialSocial,
  initialSeo,
  initialTestimonials,
  initialFaqs,
  initialExperiences,
  properties,
}: ContentManagementViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isPending, startTransition] = useTransition();

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showFeedback = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // State for Section Drafts
  const [heroForm, setHeroForm] = useState<HomepageHeroContent>(initialHero.preview);
  const [heroMeta, setHeroMeta] = useState<SectionMeta>(initialHero.meta);

  const [featuredForm, setFeaturedForm] = useState<FeaturedAccommodationsContent>(
    initialFeatured.preview
  );
  const [featuredMeta, setFeaturedMeta] = useState<SectionMeta>(initialFeatured.meta);

  const [aboutForm, setAboutForm] = useState<HomepageAboutContent>(initialAbout.preview);
  const [aboutMeta, setAboutMeta] = useState<SectionMeta>(initialAbout.meta);

  const [contactForm, setContactForm] = useState<ContactInfoContent>(initialContact.preview);
  const [contactMeta, setContactMeta] = useState<SectionMeta>(initialContact.meta);

  const [socialForm, setSocialForm] = useState<SocialMediaContent>(initialSocial.preview);
  const [socialMeta, setSocialMeta] = useState<SectionMeta>(initialSocial.meta);

  const [seoForm, setSeoForm] = useState<GlobalSeoContent>(initialSeo.preview);
  const [seoMeta, setSeoMeta] = useState<SectionMeta>(initialSeo.meta);

  // Lists state
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(initialTestimonials);
  const [faqs, setFaqs] = useState<FaqRecord[]>(initialFaqs);
  const [experiences, setExperiences] = useState<ExperienceRecord[]>(initialExperiences);

  // Modals state
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null);

  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqRecord | null>(null);

  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceRecord | null>(null);

  // Confirmation Modal
  const [publishConfirm, setPublishConfirm] = useState<{
    sectionKey: string;
    sectionTitle: string;
  } | null>(null);

  // Central Media Picker Modal state
  const [mediaPickerConfig, setMediaPickerConfig] = useState<{
    isOpen: boolean;
    filterType?: "ALL" | "IMAGE" | "VIDEO";
    onSelect: (url: string) => void;
    title?: string;
  } | null>(null);

  // Image Upload helper
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await uploadContentImageAction(formData);
      if (res.success && res.data?.url) {
        onUploaded(res.data.url);
        showFeedback("success", "Image uploaded successfully.");
      } else {
        showFeedback("error", res.error || "Failed to upload image.");
      }
    });
  };

  // Section Save Draft Handler
  const handleSaveDraft = (sectionKey: string, data: Record<string, unknown>) => {
    startTransition(async () => {
      const res = await saveSectionDraftAction(sectionKey, data);
      if (res.success) {
        showFeedback("success", res.message || "Draft saved.");
        if (sectionKey === "homepage_hero") setHeroMeta((m) => ({ ...m, hasDraft: true }));
        if (sectionKey === "featured_accommodations")
          setFeaturedMeta((m) => ({ ...m, hasDraft: true }));
        if (sectionKey === "homepage_about") setAboutMeta((m) => ({ ...m, hasDraft: true }));
        if (sectionKey === "contact_info") setContactMeta((m) => ({ ...m, hasDraft: true }));
        if (sectionKey === "social_media") setSocialMeta((m) => ({ ...m, hasDraft: true }));
        if (sectionKey === "global_seo") setSeoMeta((m) => ({ ...m, hasDraft: true }));
      } else {
        showFeedback("error", res.error || "Failed to save draft.");
      }
    });
  };

  // Section Publish Handler
  const handlePublish = (sectionKey: string) => {
    startTransition(async () => {
      const res = await publishSectionAction(sectionKey);
      if (res.success) {
        showFeedback("success", res.message || "Section published live!");
        const now = new Date();
        if (sectionKey === "homepage_hero")
          setHeroMeta((m) => ({ ...m, hasDraft: false, isPublished: true, lastPublishedAt: now }));
        if (sectionKey === "featured_accommodations")
          setFeaturedMeta((m) => ({
            ...m,
            hasDraft: false,
            isPublished: true,
            lastPublishedAt: now,
          }));
        if (sectionKey === "homepage_about")
          setAboutMeta((m) => ({ ...m, hasDraft: false, isPublished: true, lastPublishedAt: now }));
        if (sectionKey === "contact_info")
          setContactMeta((m) => ({
            ...m,
            hasDraft: false,
            isPublished: true,
            lastPublishedAt: now,
          }));
        if (sectionKey === "social_media")
          setSocialMeta((m) => ({
            ...m,
            hasDraft: false,
            isPublished: true,
            lastPublishedAt: now,
          }));
        if (sectionKey === "global_seo")
          setSeoMeta((m) => ({ ...m, hasDraft: false, isPublished: true, lastPublishedAt: now }));
        setPublishConfirm(null);
      } else {
        showFeedback("error", res.error || "Failed to publish section.");
      }
    });
  };

  // Section Discard Draft Handler
  const handleDiscardDraft = (sectionKey: string) => {
    startTransition(async () => {
      const res = await discardSectionDraftAction(sectionKey);
      if (res.success) {
        showFeedback("info", res.message || "Draft discarded.");
        if (sectionKey === "homepage_hero") {
          setHeroForm(initialHero.live);
          setHeroMeta((m) => ({ ...m, hasDraft: false }));
        }
        if (sectionKey === "featured_accommodations") {
          setFeaturedForm(initialFeatured.live);
          setFeaturedMeta((m) => ({ ...m, hasDraft: false }));
        }
        if (sectionKey === "homepage_about") {
          setAboutForm(initialAbout.live);
          setAboutMeta((m) => ({ ...m, hasDraft: false }));
        }
        if (sectionKey === "contact_info") {
          setContactForm(initialContact.live);
          setContactMeta((m) => ({ ...m, hasDraft: false }));
        }
        if (sectionKey === "social_media") {
          setSocialForm(initialSocial.live);
          setSocialMeta((m) => ({ ...m, hasDraft: false }));
        }
        if (sectionKey === "global_seo") {
          setSeoForm(initialSeo.live);
          setSeoMeta((m) => ({ ...m, hasDraft: false }));
        }
      } else {
        showFeedback("error", res.error || "Failed to discard draft.");
      }
    });
  };

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 tracking-tight">
              Website Content Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
              Internal CMS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-2xl">
            Independently manage homepage copy, guest reviews, sanctuary highlights, FAQs,
            contact information, and global SEO metadata with safe draft preview and publishing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-xs transition"
          >
            <span>View Live Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Floating Notifications */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between shadow-md transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950 text-emerald-200 border border-emerald-800"
              : feedback.type === "error"
              ? "bg-rose-950 text-rose-200 border border-rose-800"
              : "bg-neutral-900 text-neutral-200 border border-neutral-700"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedback.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-white ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-200 overflow-x-auto scrollbar-none">
        <div className="flex space-x-1 min-w-max pb-2">
          {[
            { id: "overview", label: "Overview", icon: Layout },
            { id: "hero", label: "Homepage Hero", icon: Sparkles },
            { id: "featured", label: "Featured Properties", icon: Building },
            { id: "about", label: "About DevStay", icon: Info },
            { id: "experiences", label: `Experiences (${experiences.length})`, icon: MapPin },
            {
              id: "testimonials",
              label: `Testimonials (${testimonials.length})`,
              icon: MessageSquare,
            },
            { id: "faqs", label: `FAQs (${faqs.length})`, icon: HelpCircle },
            { id: "contact", label: "Contact Info", icon: Globe },
            { id: "social", label: "Social Media", icon: Share2 },
            { id: "seo", label: "Global SEO", icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. OVERVIEW TAB */}
      {/* ============================================================ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Homepage Hero Section",
                tab: "hero",
                meta: heroMeta,
                desc: "Main billboard headline, subtitle, starting price, and CTA action buttons.",
                icon: Sparkles,
              },
              {
                title: "Featured Properties Selection",
                tab: "featured",
                meta: featuredMeta,
                desc: "Control which published properties/configurations display and their order.",
                icon: Building,
              },
              {
                title: "About DevStay & Sanctuary Story",
                tab: "about",
                meta: aboutMeta,
                desc: "Handcrafted heritage story, core stay features, and host Aparna bio.",
                icon: Info,
              },
              {
                title: "Local Experiences & Landmarks",
                tab: "experiences",
                desc: `${experiences.length} local neighborhood spots and city attractions.`,
                count: experiences.length,
                icon: MapPin,
              },
              {
                title: "Guest Reviews & Testimonials",
                tab: "testimonials",
                desc: `${testimonials.length} verified reviews highlighting 100% 5-star hospitality.`,
                count: testimonials.length,
                icon: MessageSquare,
              },
              {
                title: "Frequently Asked Questions",
                tab: "faqs",
                desc: `${faqs.length} FAQs answering house rules, celebrations, and kitchen amenities.`,
                count: faqs.length,
                icon: HelpCircle,
              },
              {
                title: "Contact Information",
                tab: "contact",
                meta: contactMeta,
                desc: "Phone, concierge email, physical address, Google Maps & WhatsApp links.",
                icon: Globe,
              },
              {
                title: "Social Media Channels",
                tab: "social",
                meta: socialMeta,
                desc: "Instagram handle (@devstays.jaipur), Facebook and secondary social links.",
                icon: Share2,
              },
              {
                title: "Global SEO & Social Graph",
                tab: "seo",
                meta: seoMeta,
                desc: "Global website title, fallback meta descriptions, default OG sharing cards.",
                icon: Globe,
              },
            ].map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs hover:border-neutral-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                        <Icon className="w-4 h-4 text-amber-700" />
                      </div>

                      {sec.meta ? (
                        <div className="flex items-center gap-1.5">
                          {sec.meta.hasDraft ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Unpublished Draft
                            </span>
                          ) : sec.meta.isPublished ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Live &amp; Published
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
                              Unpublished
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {sec.count} Items
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-neutral-900">{sec.title}</h3>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{sec.desc}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">
                      {sec.meta?.lastPublishedAt
                        ? `Published ${new Date(sec.meta.lastPublishedAt).toLocaleDateString()}`
                        : "Ready for edits"}
                    </span>
                    <button
                      onClick={() => setActiveTab(sec.tab as TabType)}
                      className="text-xs font-bold text-neutral-900 hover:text-amber-700 flex items-center gap-1"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. HOMEPAGE HERO TAB */}
      {/* ============================================================ */}
      {activeTab === "hero" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Homepage Hero Section</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Primary greeting banner seen by every guest landing on DevStay Jaipur.
              </p>
            </div>
            {heroMeta.hasDraft && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                You have unpublished draft edits
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Fields (Left) */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={heroForm.headline}
                  onChange={(e) => setHeroForm({ ...heroForm, headline: e.target.value })}
                  className="w-full text-sm font-semibold p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  placeholder="e.g. YOUR OWN PRIVATE 3BHK VILLA IN CENTRAL JAIPUR"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Hero Description / Supporting Copy
                </label>
                <textarea
                  rows={3}
                  value={heroForm.description}
                  onChange={(e) => setHeroForm({ ...heroForm, description: e.target.value })}
                  className="w-full text-xs sm:text-sm p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  placeholder="Supporting villa narrative..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Starting Nightly Price (₹)
                  </label>
                  <input
                    type="number"
                    value={heroForm.startingPrice}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, startingPrice: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full text-sm p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Background Video Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={heroForm.videoUrl}
                      onChange={(e) => setHeroForm({ ...heroForm, videoUrl: e.target.value })}
                      className="flex-1 text-xs p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMediaPickerConfig({
                          isOpen: true,
                          filterType: "VIDEO",
                          title: "Select Background Video from Library",
                          onSelect: (url) => setHeroForm((prev) => ({ ...prev, videoUrl: url })),
                        })
                      }
                      className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-700" />
                      <span>Library</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Primary Button Text
                  </label>
                  <input
                    type="text"
                    value={heroForm.primaryButtonText}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, primaryButtonText: e.target.value })
                    }
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Primary Button Link
                  </label>
                  <input
                    type="text"
                    value={heroForm.primaryButtonLink}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, primaryButtonLink: e.target.value })
                    }
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Secondary Button Text
                  </label>
                  <input
                    type="text"
                    value={heroForm.secondaryButtonText}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, secondaryButtonText: e.target.value })
                    }
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Secondary Button Link
                  </label>
                  <input
                    type="text"
                    value={heroForm.secondaryButtonLink}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, secondaryButtonLink: e.target.value })
                    }
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Poster Image (Video Fallback)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={heroForm.posterImageUrl}
                    onChange={(e) => setHeroForm({ ...heroForm, posterImageUrl: e.target.value })}
                    className="flex-1 text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMediaPickerConfig({
                        isOpen: true,
                        filterType: "IMAGE",
                        title: "Select Poster Image from Library",
                        onSelect: (url) => setHeroForm((prev) => ({ ...prev, posterImageUrl: url })),
                      })
                    }
                    className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-700" />
                    <span>Library</span>
                  </button>
                  <label className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e, (url) =>
                          setHeroForm({ ...heroForm, posterImageUrl: url })
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Live Preview Card (Right) */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Live Preview
              </span>
              <div className="relative rounded-2xl overflow-hidden bg-stone-950 p-6 text-white min-h-[320px] flex flex-col justify-between shadow-xl">
                <div className="space-y-3 relative z-10">
                  <h3 className="text-lg font-extrabold uppercase leading-tight font-sans">
                    {heroForm.headline || "YOUR HEADLINE HERE"}
                  </h3>
                  <p className="text-stone-300 text-xs line-clamp-3">
                    {heroForm.description || "Your description here..."}
                  </p>
                </div>

                <div className="pt-6 relative z-10 space-y-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase text-neutral-400">Starting from</span>
                    <span className="text-lg font-bold">
                      ₹{heroForm.startingPrice?.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-stone-300">/ night</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-white text-black text-[10px] font-bold rounded-full">
                      {heroForm.primaryButtonText}
                    </span>
                    <span className="px-3 py-1.5 bg-black/60 border border-white/30 text-white text-[10px] font-bold rounded-full">
                      {heroForm.secondaryButtonText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Draft Status:</span>
                  <span className="font-semibold text-neutral-800">
                    {heroMeta.hasDraft ? "Unsaved changes in draft" : "Draft synced with live"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    disabled={isPending}
                    onClick={() =>
                      handleSaveDraft(
                        "homepage_hero",
                        heroForm as unknown as Record<string, unknown>
                      )
                    }
                    className="w-full py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() =>
                      setPublishConfirm({
                        sectionKey: "homepage_hero",
                        sectionTitle: "Homepage Hero Section",
                      })
                    }
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Live</span>
                  </button>
                </div>
                {heroMeta.hasDraft && (
                  <button
                    disabled={isPending}
                    onClick={() => handleDiscardDraft("homepage_hero")}
                    className="w-full py-2 text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard Draft</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. FEATURED PROPERTIES TAB */}
      {/* ============================================================ */}
      {activeTab === "featured" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Featured Accommodations Selection
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Select which published properties or suite configurations appear on the homepage.
                Data continues coming directly from the Property database.
              </p>
            </div>
            {featuredMeta.hasDraft && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Unpublished draft edits
              </span>
            )}
          </div>

          <div className="space-y-5 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Section Headline
                </label>
                <input
                  type="text"
                  value={featuredForm.headline}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, headline: e.target.value })}
                  className="w-full text-sm font-semibold p-3 border border-neutral-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Section Badge Text
                </label>
                <input
                  type="text"
                  value={featuredForm.badge}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, badge: e.target.value })}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Section Subtitle / Description
              </label>
              <textarea
                rows={2}
                value={featuredForm.subtitle}
                onChange={(e) => setFeaturedForm({ ...featuredForm, subtitle: e.target.value })}
                className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Maximum Listings to Display on Homepage
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={featuredForm.maxListings}
                onChange={(e) =>
                  setFeaturedForm({
                    ...featuredForm,
                    maxListings: parseInt(e.target.value, 10) || 3,
                  })
                }
                className="w-32 text-sm p-2.5 border border-neutral-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                Published Properties in System
              </label>
              <div className="space-y-2 border border-neutral-200 rounded-2xl p-4 bg-neutral-50/50">
                {properties.map((p) => {
                  const isChecked =
                    featuredForm.selectedPropertyIds?.includes(p.id) ||
                    featuredForm.selectedPropertyIds?.length === 0;
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-neutral-200/80 cursor-pointer hover:border-neutral-300 transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const current = featuredForm.selectedPropertyIds || [];
                          if (e.target.checked) {
                            setFeaturedForm({
                              ...featuredForm,
                              selectedPropertyIds: [...current, p.id],
                            });
                          } else {
                            setFeaturedForm({
                              ...featuredForm,
                              selectedPropertyIds: current.filter((id) => id !== p.id),
                            });
                          }
                        }}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{p.name}</div>
                        <div className="text-[11px] text-neutral-500">{p.headline}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <button
                disabled={isPending}
                onClick={() =>
                  handleSaveDraft(
                    "featured_accommodations",
                    featuredForm as unknown as Record<string, unknown>
                  )
                }
                className="py-2.5 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  setPublishConfirm({
                    sectionKey: "featured_accommodations",
                    sectionTitle: "Featured Properties",
                  })
                }
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Live</span>
              </button>
              {featuredMeta.hasDraft && (
                <button
                  disabled={isPending}
                  onClick={() => handleDiscardDraft("featured_accommodations")}
                  className="py-2.5 px-4 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                >
                  Discard Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ABOUT DEVSTAY TAB */}
      {/* ============================================================ */}
      {activeTab === "about" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                About DevStay &amp; Sanctuary Story
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Handcrafted story, core property highlights, and host Aparna profile information.
              </p>
            </div>
            {aboutMeta.hasDraft && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Unpublished draft edits
              </span>
            )}
          </div>

          <div className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Section Headline
                </label>
                <input
                  type="text"
                  value={aboutForm.headline}
                  onChange={(e) => setAboutForm({ ...aboutForm, headline: e.target.value })}
                  className="w-full text-sm font-semibold p-3 border border-neutral-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Badge Pill Text
                </label>
                <input
                  type="text"
                  value={aboutForm.badge}
                  onChange={(e) => setAboutForm({ ...aboutForm, badge: e.target.value })}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Lead Sanctuary Description
              </label>
              <textarea
                rows={3}
                value={aboutForm.description}
                onChange={(e) => setAboutForm({ ...aboutForm, description: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 border border-neutral-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Brand Heritage Story
              </label>
              <textarea
                rows={3}
                value={aboutForm.brandStory}
                onChange={(e) => setAboutForm({ ...aboutForm, brandStory: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 border border-neutral-300 rounded-xl outline-none"
              />
            </div>

            {/* Highlights Editor */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Core Villa Highlights (4 Grid Items)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {aboutForm.highlights?.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
                    <input
                      type="text"
                      value={h.title}
                      onChange={(e) => {
                        const next = [...aboutForm.highlights];
                        next[i] = { ...next[i], title: e.target.value };
                        setAboutForm({ ...aboutForm, highlights: next });
                      }}
                      className="w-full text-xs font-bold p-2 bg-white border border-neutral-200 rounded-lg outline-none"
                      placeholder="Title"
                    />
                    <textarea
                      rows={2}
                      value={h.detail}
                      onChange={(e) => {
                        const next = [...aboutForm.highlights];
                        next[i] = { ...next[i], detail: e.target.value };
                        setAboutForm({ ...aboutForm, highlights: next });
                      }}
                      className="w-full text-xs p-2 bg-white border border-neutral-200 rounded-lg outline-none"
                      placeholder="Details"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Host Profile Editor */}
            <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/70 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Host Profile Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Host Name
                  </label>
                  <input
                    type="text"
                    value={aboutForm.host?.name}
                    onChange={(e) =>
                      setAboutForm({
                        ...aboutForm,
                        host: { ...aboutForm.host, name: e.target.value },
                      })
                    }
                    className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Role &amp; Title
                  </label>
                  <input
                    type="text"
                    value={aboutForm.host?.role}
                    onChange={(e) =>
                      setAboutForm({
                        ...aboutForm,
                        host: { ...aboutForm.host, role: e.target.value },
                      })
                    }
                    className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Superhost Badge
                  </label>
                  <input
                    type="text"
                    value={aboutForm.host?.superhostBadge}
                    onChange={(e) =>
                      setAboutForm({
                        ...aboutForm,
                        host: { ...aboutForm.host, superhostBadge: e.target.value },
                      })
                    }
                    className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Host Biography
                </label>
                <textarea
                  rows={2}
                  value={aboutForm.host?.bio}
                  onChange={(e) =>
                    setAboutForm({
                      ...aboutForm,
                      host: { ...aboutForm.host, bio: e.target.value },
                    })
                  }
                  className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <button
                disabled={isPending}
                onClick={() =>
                  handleSaveDraft(
                    "homepage_about",
                    aboutForm as unknown as Record<string, unknown>
                  )
                }
                className="py-2.5 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  setPublishConfirm({
                    sectionKey: "homepage_about",
                    sectionTitle: "About DevStay",
                  })
                }
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Live</span>
              </button>
              {aboutMeta.hasDraft && (
                <button
                  disabled={isPending}
                  onClick={() => handleDiscardDraft("homepage_about")}
                  className="py-2.5 px-4 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                >
                  Discard Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. EXPERIENCES TAB */}
      {/* ============================================================ */}
      {activeTab === "experiences" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Local Experiences &amp; Landmarks</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Curate Raja Park cafes, heritage monuments, bazaars, and distance times.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingExperience(null);
                setShowExperienceModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Experience</span>
            </button>
          </div>

          <div className="space-y-3">
            {experiences.map((exp, index) => (
              <div
                key={exp.id}
                className="p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-neutral-900">{exp.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {exp.category || "Neighborhood"}
                      </span>
                      {!exp.isPublished && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          Unpublished
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-900 font-medium mt-0.5">{exp.subtitle}</p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xl">{exp.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    disabled={index === 0 || isPending}
                    onClick={() => {
                      const next = [...experiences];
                      const temp = next[index - 1];
                      next[index - 1] = next[index];
                      next[index] = temp;
                      setExperiences(next);
                      startTransition(async () => {
                        await reorderExperiencesAction(next.map((e) => e.id));
                      });
                    }}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move Up"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === experiences.length - 1 || isPending}
                    onClick={() => {
                      const next = [...experiences];
                      const temp = next[index + 1];
                      next[index + 1] = next[index];
                      next[index] = temp;
                      setExperiences(next);
                      startTransition(async () => {
                        await reorderExperiencesAction(next.map((e) => e.id));
                      });
                    }}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move Down"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingExperience(exp);
                      setShowExperienceModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete experience "${exp.title}"?`)) {
                        startTransition(async () => {
                          const res = await deleteExperienceAction(exp.id);
                          if (res.success) {
                            setExperiences(experiences.filter((e) => e.id !== exp.id));
                            showFeedback("info", "Experience deleted.");
                          }
                        });
                      }
                    }}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TESTIMONIALS TAB */}
      {/* ============================================================ */}
      {activeTab === "testimonials" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Guest Reviews &amp; Testimonials</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Authentic verified guest stays, star ratings, and review testimonials.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTestimonial(null);
                setShowTestimonialModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="space-y-3">
            {testimonials.map((t, index) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">{t.guestName}</span>
                    <span className="text-[11px] text-neutral-500 font-medium">· {t.location}</span>
                    <div className="flex items-center text-amber-500 text-xs">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      ))}
                    </div>
                    {!t.isPublished && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Unpublished
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 italic leading-relaxed">
                    &ldquo;{t.reviewText}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    disabled={index === 0 || isPending}
                    onClick={() => {
                      const next = [...testimonials];
                      const temp = next[index - 1];
                      next[index - 1] = next[index];
                      next[index] = temp;
                      setTestimonials(next);
                      startTransition(async () => {
                        await reorderTestimonialsAction(next.map((item) => item.id));
                      });
                    }}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move Up"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === testimonials.length - 1 || isPending}
                    onClick={() => {
                      const next = [...testimonials];
                      const temp = next[index + 1];
                      next[index + 1] = next[index];
                      next[index] = temp;
                      setTestimonials(next);
                      startTransition(async () => {
                        await reorderTestimonialsAction(next.map((item) => item.id));
                      });
                    }}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move Down"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingTestimonial(t);
                      setShowTestimonialModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete testimonial by "${t.guestName}"?`)) {
                        startTransition(async () => {
                          const res = await deleteTestimonialAction(t.id);
                          if (res.success) {
                            setTestimonials(testimonials.filter((item) => item.id !== t.id));
                            showFeedback("info", "Testimonial removed.");
                          }
                        });
                      }
                    }}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. FAQS TAB */}
      {/* ============================================================ */}
      {activeTab === "faqs" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Frequently Asked Questions (FAQ)</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Answer guest inquiries regarding house rules, check-in, celebrations, and amenities.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingFaq(null);
                setShowFaqModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                      {faq.category || "General"}
                    </span>
                    <h3 className="font-bold text-sm text-neutral-900">{faq.question}</h3>
                    {!faq.isPublished && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Unpublished
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed pl-1">{faq.answer}</p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    disabled={index === 0 || isPending}
                    onClick={() => {
                      const next = [...faqs];
                      const temp = next[index - 1];
                      next[index - 1] = next[index];
                      next[index] = temp;
                      setFaqs(next);
                      startTransition(async () => {
                        await reorderFaqsAction(next.map((item) => item.id));
                      });
                    }}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move Up"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === faqs.length - 1 || isPending}
                    onClick={() => {
                      const next = [...faqs];
                      const temp = next[index + 1];
                      next[index + 1] = next[index];
                      next[index] = temp;
                      setFaqs(next);
                      startTransition(async () => {
                        await reorderFaqsAction(next.map((item) => item.id));
                      });
                    }}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move Down"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingFaq(faq);
                      setShowFaqModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete FAQ "${faq.question}"?`)) {
                        startTransition(async () => {
                          const res = await deleteFaqAction(faq.id);
                          if (res.success) {
                            setFaqs(faqs.filter((item) => item.id !== faq.id));
                            showFeedback("info", "FAQ deleted.");
                          }
                        });
                      }
                    }}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. CONTACT INFO TAB */}
      {/* ============================================================ */}
      {activeTab === "contact" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Contact Information</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Official guest concierge details displayed on footer and inquiry points.
              </p>
            </div>
            {contactMeta.hasDraft && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Unpublished draft edits
              </span>
            )}
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Business Phone Number
                </label>
                <input
                  type="text"
                  value={contactForm.businessPhone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, businessPhone: e.target.value })
                  }
                  className="w-full text-sm p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="+91 141 289 4400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Concierge Email Address
                </label>
                <input
                  type="email"
                  value={contactForm.contactEmail}
                  onChange={(e) => setContactForm({ ...contactForm, contactEmail: e.target.value })}
                  className="w-full text-sm p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="concierge@devstaysjaipur.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Physical Property Address
              </label>
              <textarea
                rows={2}
                value={contactForm.physicalAddress}
                onChange={(e) =>
                  setContactForm({ ...contactForm, physicalAddress: e.target.value })
                }
                className="w-full text-xs sm:text-sm p-3 border border-neutral-300 rounded-xl outline-none"
                placeholder="Raja Park, Central Jaipur, Rajasthan 302004, India"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Google Maps Link
                </label>
                <input
                  type="text"
                  value={contactForm.googleMapsUrl}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, googleMapsUrl: e.target.value })
                  }
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  WhatsApp Direct Contact Link
                </label>
                <input
                  type="text"
                  value={contactForm.whatsappUrl}
                  onChange={(e) => setContactForm({ ...contactForm, whatsappUrl: e.target.value })}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="https://wa.me/911412894400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <button
                disabled={isPending}
                onClick={() =>
                  handleSaveDraft(
                    "contact_info",
                    contactForm as unknown as Record<string, unknown>
                  )
                }
                className="py-2.5 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  setPublishConfirm({
                    sectionKey: "contact_info",
                    sectionTitle: "Contact Information",
                  })
                }
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Live</span>
              </button>
              {contactMeta.hasDraft && (
                <button
                  disabled={isPending}
                  onClick={() => handleDiscardDraft("contact_info")}
                  className="py-2.5 px-4 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                >
                  Discard Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. SOCIAL MEDIA TAB */}
      {/* ============================================================ */}
      {activeTab === "social" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Social Media &amp; Instagram</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Profile links for Instagram, Facebook, and other social brand channels.
              </p>
            </div>
            {socialMeta.hasDraft && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Unpublished draft edits
              </span>
            )}
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Instagram Profile URL
              </label>
              <input
                type="text"
                value={socialForm.instagramUrl}
                onChange={(e) => setSocialForm({ ...socialForm, instagramUrl: e.target.value })}
                className="w-full text-sm p-3 border border-neutral-300 rounded-xl outline-none"
                placeholder="https://instagram.com/devstays.jaipur"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Connected to the homepage Instagram feed. Graph API credentials remain safely server-side.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Facebook Page URL
              </label>
              <input
                type="text"
                value={socialForm.facebookUrl}
                onChange={(e) => setSocialForm({ ...socialForm, facebookUrl: e.target.value })}
                className="w-full text-sm p-3 border border-neutral-300 rounded-xl outline-none"
                placeholder="https://facebook.com/devstaysjaipur"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Twitter / X Profile URL
                </label>
                <input
                  type="text"
                  value={socialForm.twitterUrl || ""}
                  onChange={(e) => setSocialForm({ ...socialForm, twitterUrl: e.target.value })}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="https://twitter.com/devstaysjaipur"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  YouTube Channel URL
                </label>
                <input
                  type="text"
                  value={socialForm.youtubeUrl || ""}
                  onChange={(e) => setSocialForm({ ...socialForm, youtubeUrl: e.target.value })}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="https://youtube.com/@devstaysjaipur"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <button
                disabled={isPending}
                onClick={() =>
                  handleSaveDraft(
                    "social_media",
                    socialForm as unknown as Record<string, unknown>
                  )
                }
                className="py-2.5 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  setPublishConfirm({
                    sectionKey: "social_media",
                    sectionTitle: "Social Media Channels",
                  })
                }
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Live</span>
              </button>
              {socialMeta.hasDraft && (
                <button
                  disabled={isPending}
                  onClick={() => handleDiscardDraft("social_media")}
                  className="py-2.5 px-4 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                >
                  Discard Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. GLOBAL SEO TAB */}
      {/* ============================================================ */}
      {activeTab === "seo" && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Global Website SEO Settings</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Site-wide default meta title, descriptions, social sharing cards, and search engine directives.
              </p>
            </div>
            {seoMeta.hasDraft && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Unpublished draft edits
              </span>
            )}
          </div>

          <div className="space-y-4 max-w-3xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Global Website Title
              </label>
              <input
                type="text"
                value={seoForm.siteTitle}
                onChange={(e) => setSeoForm({ ...seoForm, siteTitle: e.target.value })}
                className="w-full text-sm font-semibold p-3 border border-neutral-300 rounded-xl outline-none"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Property-level custom SEO titles strictly take precedence on individual property detail pages.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Default Meta Description
              </label>
              <textarea
                rows={3}
                value={seoForm.defaultMetaDescription}
                onChange={(e) =>
                  setSeoForm({ ...seoForm, defaultMetaDescription: e.target.value })
                }
                className="w-full text-xs sm:text-sm p-3 border border-neutral-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Default Open Graph Social Sharing Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seoForm.defaultOgImageUrl}
                  onChange={(e) => setSeoForm({ ...seoForm, defaultOgImageUrl: e.target.value })}
                  className="flex-1 text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setMediaPickerConfig({
                      isOpen: true,
                      filterType: "IMAGE",
                      title: "Select Global Social Sharing Image from Library",
                      onSelect: (url) => setSeoForm((prev) => ({ ...prev, defaultOgImageUrl: url })),
                    })
                  }
                  className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-700" />
                  <span>Library</span>
                </button>
                <label className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageUpload(e, (url) =>
                        setSeoForm({ ...seoForm, defaultOgImageUrl: url })
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Open Graph Title
                </label>
                <input
                  type="text"
                  value={seoForm.ogTitle || ""}
                  onChange={(e) => setSeoForm({ ...seoForm, ogTitle: e.target.value })}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Open Graph Description
                </label>
                <input
                  type="text"
                  value={seoForm.ogDescription || ""}
                  onChange={(e) => setSeoForm({ ...seoForm, ogDescription: e.target.value })}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800">
                <input
                  type="checkbox"
                  checked={seoForm.robotsIndex}
                  onChange={(e) => setSeoForm({ ...seoForm, robotsIndex: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Allow Search Engines to Index Site (robots: index)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-neutral-800">
                <input
                  type="checkbox"
                  checked={seoForm.robotsFollow}
                  onChange={(e) => setSeoForm({ ...seoForm, robotsFollow: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Follow Links on Pages (robots: follow)</span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <button
                disabled={isPending}
                onClick={() =>
                  handleSaveDraft(
                    "global_seo",
                    seoForm as unknown as Record<string, unknown>
                  )
                }
                className="py-2.5 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  setPublishConfirm({
                    sectionKey: "global_seo",
                    sectionTitle: "Global Website SEO",
                  })
                }
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Live</span>
              </button>
              {seoMeta.hasDraft && (
                <button
                  disabled={isPending}
                  onClick={() => handleDiscardDraft("global_seo")}
                  className="py-2.5 px-4 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                >
                  Discard Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TESTIMONIAL ADD / EDIT */}
      {/* ============================================================ */}
      {showTestimonialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">
                {editingTestimonial ? "Edit Testimonial" : "Add Guest Review"}
              </h3>
              <button
                onClick={() => setShowTestimonialModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const guestName = (form.elements.namedItem("guestName") as HTMLInputElement).value;
                const location = (form.elements.namedItem("location") as HTMLInputElement).value;
                const rating = parseInt(
                  (form.elements.namedItem("rating") as HTMLSelectElement).value,
                  10
                );
                const reviewText = (
                  form.elements.namedItem("reviewText") as HTMLTextAreaElement
                ).value;

                startTransition(async () => {
                  if (editingTestimonial) {
                    const res = await updateTestimonialAction(editingTestimonial.id, {
                      guestName,
                      location,
                      rating,
                      reviewText,
                    });
                    if (res.success && res.data) {
                      setTestimonials(
                        testimonials.map((t) =>
                          t.id === editingTestimonial.id ? (res.data as TestimonialItem) : t
                        )
                      );
                      showFeedback("success", "Testimonial updated.");
                      setShowTestimonialModal(false);
                    }
                  } else {
                    const res = await createTestimonialAction({
                      guestName,
                      location,
                      rating,
                      reviewText,
                    });
                    if (res.success && res.data) {
                      setTestimonials([...testimonials, res.data as TestimonialItem]);
                      showFeedback("success", "Testimonial created.");
                      setShowTestimonialModal(false);
                    }
                  }
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Guest Name</label>
                <input
                  name="guestName"
                  defaultValue={editingTestimonial?.guestName || ""}
                  required
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="e.g. Sumit"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Stay Location / Tag
                  </label>
                  <input
                    name="location"
                    defaultValue={editingTestimonial?.location || "Family & Friends Stay"}
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Rating (Stars)
                  </label>
                  <select
                    name="rating"
                    defaultValue={editingTestimonial?.rating ?? 5}
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none bg-white"
                  >
                    <option value={5}>5 Stars ★★★★★</option>
                    <option value={4}>4 Stars ★★★★☆</option>
                    <option value={3}>3 Stars ★★★☆☆</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Review Text</label>
                <textarea
                  name="reviewText"
                  rows={4}
                  required
                  defaultValue={editingTestimonial?.reviewText || ""}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="Guest review remarks..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowTestimonialModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                >
                  Save Testimonial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: FAQ ADD / EDIT */}
      {/* ============================================================ */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">
                {editingFaq ? "Edit Question" : "Add FAQ Question"}
              </h3>
              <button onClick={() => setShowFaqModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const question = (form.elements.namedItem("question") as HTMLInputElement).value;
                const category = (form.elements.namedItem("category") as HTMLInputElement).value;
                const answer = (form.elements.namedItem("answer") as HTMLTextAreaElement).value;

                startTransition(async () => {
                  if (editingFaq) {
                    const res = await updateFaqAction(editingFaq.id, {
                      question,
                      category,
                      answer,
                    });
                    if (res.success && res.data) {
                      setFaqs(faqs.map((f) => (f.id === editingFaq.id ? (res.data as FaqRecord) : f)));
                      showFeedback("success", "FAQ updated.");
                      setShowFaqModal(false);
                    }
                  } else {
                    const res = await createFaqAction({ question, category, answer });
                    if (res.success && res.data) {
                      setFaqs([...faqs, res.data as FaqRecord]);
                      showFeedback("success", "FAQ created.");
                      setShowFaqModal(false);
                    }
                  }
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Question Text
                </label>
                <input
                  name="question"
                  defaultValue={editingFaq?.question || ""}
                  required
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="e.g. What are the check-in and checkout timings?"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Category</label>
                <input
                  name="category"
                  defaultValue={editingFaq?.category || "House Rules"}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="e.g. Events, Kitchen, Amenities, House Rules"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Answer</label>
                <textarea
                  name="answer"
                  rows={4}
                  required
                  defaultValue={editingFaq?.answer || ""}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="Detailed answer text..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EXPERIENCE ADD / EDIT */}
      {/* ============================================================ */}
      {showExperienceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">
                {editingExperience ? "Edit Experience" : "Add Experience / Landmark"}
              </h3>
              <button
                onClick={() => setShowExperienceModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = (form.elements.namedItem("title") as HTMLInputElement).value;
                const subtitle = (form.elements.namedItem("subtitle") as HTMLInputElement).value;
                const category = (form.elements.namedItem("category") as HTMLInputElement).value;
                const description = (
                  form.elements.namedItem("description") as HTMLTextAreaElement
                ).value;

                startTransition(async () => {
                  if (editingExperience) {
                    const res = await updateExperienceAction(editingExperience.id, {
                      title,
                      subtitle,
                      category,
                      description,
                    });
                    if (res.success && res.data) {
                      setExperiences(
                        experiences.map((exp) =>
                          exp.id === editingExperience.id ? (res.data as ExperienceRecord) : exp
                        )
                      );
                      showFeedback("success", "Experience updated.");
                      setShowExperienceModal(false);
                    }
                  } else {
                    const res = await createExperienceAction({
                      title,
                      subtitle,
                      category,
                      description,
                    });
                    if (res.success && res.data) {
                      setExperiences([...experiences, res.data as ExperienceRecord]);
                      showFeedback("success", "Experience created.");
                      setShowExperienceModal(false);
                    }
                  }
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Experience Title
                </label>
                <input
                  name="title"
                  defaultValue={editingExperience?.title || ""}
                  required
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="e.g. Cafes & Street Food Lanes"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Distance &amp; Time
                  </label>
                  <input
                    name="subtitle"
                    defaultValue={editingExperience?.subtitle || "2 Mins Walk · 200 m"}
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Category</label>
                  <input
                    name="category"
                    defaultValue={editingExperience?.category || "Neighborhood"}
                    className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                    placeholder="Food, Heritage, Shopping"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  defaultValue={editingExperience?.description || ""}
                  className="w-full text-xs p-3 border border-neutral-300 rounded-xl outline-none"
                  placeholder="Neighborhood highlights..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowExperienceModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                >
                  Save Experience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PUBLISH CONFIRMATION */}
      {/* ============================================================ */}
      {publishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-neutral-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-neutral-900">
                Publish {publishConfirm.sectionTitle} Live?
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                This will immediately overwrite the current live website content with your saved draft
                and purge Next.js server caches. Public visitors will see these updates instantly.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPublishConfirm(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handlePublish(publishConfirm.sectionKey)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirm &amp; Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Central Media Gallery Picker Modal */}
      {mediaPickerConfig && (
        <MediaPickerModal
          isOpen={mediaPickerConfig.isOpen}
          title={mediaPickerConfig.title || "Select Media Asset"}
          filterType={mediaPickerConfig.filterType || "ALL"}
          onClose={() => setMediaPickerConfig(null)}
          onSelect={(selected) => {
            mediaPickerConfig.onSelect(selected.url);
            setMediaPickerConfig(null);
          }}
        />
      )}
    </div>
  );
}
