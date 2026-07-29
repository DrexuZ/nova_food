import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface HeroSection {
  title?: string;
  subtitle?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundImage?: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface CtaSection {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

export default function DesignLanding() {
  const { t } = useTranslation();
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [hero, setHero] = useState<HeroSection>({});
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [cta, setCta] = useState<CtaSection>({});

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          if (res.data.heroSection) setHero(res.data.heroSection);
          if (res.data.featuresSection) setFeatures(res.data.featuresSection);
          if (res.data.ctaSection) setCta(res.data.ctaSection);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ heroSection: hero, featuresSection: features, ctaSection: cta }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('landing.updated'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('common.failedToSave'));
      }
    } catch {
      setError(t('common.networkError'));
    } finally {
      setSaving(false);
    }
  }

  function addFeature() {
    setFeatures([...features, { icon: '⭐', title: '', description: '' }]);
  }

  function removeFeature(index: number) {
    setFeatures(features.filter((_, i) => i !== index));
  }

  function updateFeature(index: number, field: keyof FeatureItem, value: string) {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    setFeatures(updated);
  }

  if (loading) return <div className="p-6 text-gray-500">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('landing.pageTitle')}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? t('common.saving') : t('common.saveChanges')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      {/* Hero Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('landing.heroSection')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.title')}</label>
            <input
              type="text"
              value={hero.title || ''}
              onChange={(e) => setHero({ ...hero, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.titlePlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.subtitle')}</label>
            <textarea
              value={hero.subtitle || ''}
              onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.subtitlePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.primaryCta')}</label>
            <input
              type="text"
              value={hero.ctaPrimaryText || ''}
              onChange={(e) => setHero({ ...hero, ctaPrimaryText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.primaryCtaPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.primaryCtaLink')}</label>
            <input
              type="text"
              value={hero.ctaPrimaryLink || ''}
              onChange={(e) => setHero({ ...hero, ctaPrimaryLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.primaryCtaLinkPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.secondaryCta')}</label>
            <input
              type="text"
              value={hero.ctaSecondaryText || ''}
              onChange={(e) => setHero({ ...hero, ctaSecondaryText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.secondaryCtaPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.secondaryCtaLink')}</label>
            <input
              type="text"
              value={hero.ctaSecondaryLink || ''}
              onChange={(e) => setHero({ ...hero, ctaSecondaryLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.secondaryCtaLinkPlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.bgImage')}</label>
            <input
              type="text"
              value={hero.backgroundImage || ''}
              onChange={(e) => setHero({ ...hero, backgroundImage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.bgImagePlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('landing.featuresSection')}</h2>
          <button
            type="button"
            onClick={addFeature}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + {t('landing.addFeature')}
          </button>
        </div>
        {features.length === 0 && (
          <p className="text-sm text-gray-500">{t('landing.noFeatures')}</p>
        )}
        <div className="space-y-4">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('landing.icon')}</label>
                <input
                  type="text"
                  value={feature.icon}
                  onChange={(e) => updateFeature(i, 'icon', e.target.value)}
                  className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('landing.featureTitle')}</label>
                  <input
                    type="text"
                    value={feature.title}
                    onChange={(e) => updateFeature(i, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('landing.featureDescription')}</label>
                  <input
                    type="text"
                    value={feature.description}
                    onChange={(e) => updateFeature(i, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFeature(i)}
                className="mt-5 text-red-500 hover:text-red-700 text-sm"
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('landing.ctaSection')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.ctaTitle')}</label>
            <input
              type="text"
              value={cta.title || ''}
              onChange={(e) => setCta({ ...cta, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.ctaTitlePlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.ctaDescription')}</label>
            <textarea
              value={cta.description || ''}
              onChange={(e) => setCta({ ...cta, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.ctaButtonText')}</label>
            <input
              type="text"
              value={cta.buttonText || ''}
              onChange={(e) => setCta({ ...cta, buttonText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.ctaButtonPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.ctaButtonLink')}</label>
            <input
              type="text"
              value={cta.buttonLink || ''}
              onChange={(e) => setCta({ ...cta, buttonLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('landing.ctaButtonLinkPlaceholder')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
