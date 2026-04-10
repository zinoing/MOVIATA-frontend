import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Layout from '../components/Layout';

type ActivityType = 'path' | 'motion';

export default function ActivityTypePage() {
  const router = useRouter();
  const t = useTranslations('activityType');
  const tCommon = useTranslations('common');

  const activities = [
    {
      type: 'path' as ActivityType,
      label: 'PATH',
      description: t('activities.path.description'),
      image: '/activity-type/path.jpg',
      available: true,
    },
    {
      type: null,
      label: 'MOTION',
      description: t('activities.motion.description'),
      image: '/activity-type/motion.jpg',
      available: false,
    },
  ];

  function handleSelect(type: ActivityType) {
    sessionStorage.setItem('activityType', type);
    void router.push('/start');
  }

  return (
    <Layout title="Choose Your Activity — MOVIATA">
      <div className="min-h-screen bg-white px-4 py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl text-center mb-12">
          <h1 className="text-4xl font-black tracking-[-0.02em] text-neutral-950 sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-sm leading-7 text-neutral-500 sm:text-base">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          {activities.map((activity) => (
            <div
              key={activity.label}
              className="relative flex flex-col overflow-hidden rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
            >
              {/* Image area */}
              <div
                className="relative h-48 w-full bg-cover bg-center bg-neutral-100"
                style={{ backgroundImage: `url(${activity.image})` }}
              >
                <div className="absolute inset-0 bg-black/30" />
              </div>

              {/* Text area */}
              <div className="flex flex-1 flex-col bg-white px-5 py-5">
                <h2 className="text-lg font-black tracking-[0.02em] text-neutral-950">
                  {activity.label}
                </h2>
                <p className="mt-2 flex-1 text-xs leading-5 text-neutral-500">
                  {activity.description}
                </p>

                <div className="mt-5">
                  {activity.available ? (
                    <button
                      type="button"
                      onClick={() => activity.type && handleSelect(activity.type)}
                      className="w-full rounded-[14px] bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF5A1F]"
                    >
                      {tCommon('select')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-[14px] bg-neutral-100 px-5 py-2.5 text-sm font-semibold text-neutral-400"
                    >
                      {tCommon('comingSoon')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
