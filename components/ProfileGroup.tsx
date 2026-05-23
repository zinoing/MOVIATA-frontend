type ProfileUser = {
  id: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  isPrimary?: boolean;
};

type ProfileGroupProps = {
  users: ProfileUser[];
  compact?: boolean;
  className?: string;
  isDark?: boolean;
};

function getDisplayHandle(user?: ProfileUser) {
  if (!user) return '@username';
  const raw = user.username || user.name || 'username';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

function pickPrimary(users: ProfileUser[]) {
  return users.find((u) => u.isPrimary) ?? users[0];
}

function CircleAvatar({
  user,
  size,
  isDark,
}: {
  user?: ProfileUser;
  size: number;
  isDark: boolean;
}) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    // FIX: inline-block instead of block so the element participates in
    // the flex line's baseline calculation the same way in both the browser
    // and html2canvas.  'block' caused the avatar to shift upward after capture.
    display: 'inline-block',
    verticalAlign: 'middle',
  };

  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={getDisplayHandle(user)}
        style={{ ...base, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      style={{
        ...base,
        border: '1.5px solid #d1d5db',
        background: isDark ? 'rgba(255,255,255,0.08)' : 'white',
      }}
    />
  );
}

export default function ProfileGroup({
  users,
  compact = false,
  className,
  isDark = false,
}: ProfileGroupProps) {
  const primaryUser = pickPrimary(users);

  const primarySize = compact ? 26 : 36;
  const primaryFontSize = compact ? 15 : 18;
  const primaryColor = isDark ? '#EDE8DC' : '#111111';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 8 : 10,
        overflow: 'visible',
      }}
    >
      <div style={{ flexShrink: 0, width: primarySize, height: primarySize }}>
        <CircleAvatar user={primaryUser} size={primarySize} isDark={isDark} />
      </div>

      <div
        style={{
          fontSize: primaryFontSize,
          fontWeight: 600,
          lineHeight: 1.3,
          color: primaryColor,
          whiteSpace: 'nowrap',
        }}
      >
        {getDisplayHandle(primaryUser)}
      </div>
    </div>
  );
}