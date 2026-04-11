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

function pickPrimaryAndTagged(users: ProfileUser[]) {
  if (!users.length) return { primaryUser: undefined, taggedUser: undefined };
  const primaryUser = users.find((u) => u.isPrimary) ?? users[0];
  const taggedUser = users.find((u) => u.id !== primaryUser.id);
  return { primaryUser, taggedUser };
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
  const { primaryUser, taggedUser } = pickPrimaryAndTagged(users);

  const primarySize = compact ? 26 : 36;
  const friendSize = compact ? 13 : 16;
  const primaryFontSize = compact ? 10 : 12;
  const friendFontSize = compact ? 9 : 11;
  const outerGap = compact ? 8 : 10;

  const primaryColor = isDark ? '#ffffff' : '#111111';
  const friendColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: taggedUser ? 'flex-start' : 'center',
        gap: outerGap,
        overflow: 'visible',
      }}
    >
      {/* Primary avatar
          FIX: explicit width/height + alignSelf: 'flex-start' prevents html2canvas
          from stretching this wrapper to match the text column's full height,
          which was causing the avatar to appear oversized after capture. */}
      <div
        style={{
          flexShrink: 0,
          width: primarySize,
          height: primarySize,
          alignSelf: 'flex-start',
        }}
      >
        <CircleAvatar user={primaryUser} size={primarySize} isDark={isDark} />
      </div>

      {taggedUser ? (
        /* Two-line layout: flex column, html2canvas-safe */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 3 : 4,
          }}
        >
          {/* Primary handle */}
          <div
            style={{
              fontSize: primaryFontSize,
              fontWeight: 600,
              // FIX: use a unitless ratio so html2canvas and the browser agree on
              // the computed line-height.  A px value equal to font-size collapses
              // descenders and can shift the element unpredictably after capture.
              lineHeight: 1.3,
              color: primaryColor,
              whiteSpace: 'nowrap',
            }}
          >
            {getDisplayHandle(primaryUser)}
          </div>

          {/* Friend row
              FIX: all three children (↻ glyph, avatar, handle) are given the
              same explicit height via lineHeight === friendSize so html2canvas
              has no ambiguity about the row's height and every item sits on the
              same centre line.  alignItems: 'center' alone is not enough because
              html2canvas mis-measures mixed inline/block children. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              // Clamp the row height so html2canvas cannot over-expand it
              height: friendSize,
            }}
          >
            <span
              style={{
                fontSize: compact ? 8 : 10,
                fontWeight: 700,
                // Match the row height exactly so the glyph doesn't shift
                lineHeight: `${friendSize}px`,
                color: friendColor,
                // Prevent the glyph from adding extra ascender/descender space
                display: 'inline-flex',
                alignItems: 'center',
                height: friendSize,
              }}
            >
              +
            </span>

            <CircleAvatar user={taggedUser} size={friendSize} isDark={isDark} />

            <span
              style={{
                fontSize: friendFontSize,
                // Match the row height exactly
                lineHeight: `${friendSize}px`,
                color: friendColor,
                whiteSpace: 'nowrap',
              }}
            >
              {getDisplayHandle(taggedUser)}
            </span>
          </div>
        </div>
      ) : (
        /* Single-line layout */
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
      )}
    </div>
  );
}