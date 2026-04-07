import { useRouter } from 'next/router';
import Layout from '../components/Layout';

type ActivityType = 'running' | 'hiking';

const activities = [
  {
    type: 'running' as ActivityType,
    label: 'RUNNING',
    description: 'Track your runs and improve your pace with precision GPS and split analytics.',
    image: '/activity-type/running.jpg',
    available: true,
  },
  {
    type: 'hiking' as ActivityType,
    label: 'HIKING',
    description: 'Explore trails and capture your altitude with offline maps and terrain mapping.',
    image: '/activity-type/mountain.jpg',
    available: true,
  },
  {
    type: null,
    label: 'CLIMBING',
    description: 'Vertical problem-solving. Coming to the Moviata Studio soon.',
    image: '/activity-type/climbing.jpg',
    available: false,
  },
];

export default function ActivityTypePage() {
  const router = useRouter();

  function handleSelect(type: ActivityType) {
    sessionStorage.setItem('activityType', type);
    void router.push('/start');
  }

  return (
    <Layout title="Choose Your Activity — MOVIATA">
      <div className="min-h-screen bg-white px-4 py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl text-center mb-12">
          <h1 className="text-4xl font-black tracking-[-0.02em] text-neutral-950 sm:text-5xl">
            CHOOSE YOUR MOVEMENT
          </h1>
          <p className="mt-4 text-sm leading-7 text-neutral-500 sm:text-base">
            Define your path. Select the rhythm that matches your energy today.
          </p>
        </div>

        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {activities.map((activity) => (
            <div
              key={activity.label}
              className={`relative flex flex-col overflow-hidden rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition ${
                activity.available ? 'hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'opacity-50'
              }`}
            >
              {/* Image area */}
              <div
                className="relative h-48 w-full bg-cover bg-center"
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
                      onClick={() => handleSelect(activity.type!)}
                      className="w-full rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
                    >
                      SELECT
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-full bg-neutral-100 py-3 text-sm font-bold tracking-[0.08em] text-neutral-400"
                    >
                      COMING SOON
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
