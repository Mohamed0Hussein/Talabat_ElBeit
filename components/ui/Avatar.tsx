import { View } from 'react-native';
import { AVATAR_COLORS, AVATAR_TEXT } from '@/theme/tokens';
import { AppText } from './AppText';

export type Person = { id: string; name: string };

function colorFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const initial = (name: string) => Array.from(name.trim())[0]?.toUpperCase() ?? '?';

export function Avatar({ person, size = 32, ring }: { person: Person; size?: number; ring?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colorFor(person.id),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2 : 0,
        borderColor: ring,
      }}
    >
      <AppText variant="bodyStrong" style={{ color: AVATAR_TEXT, fontSize: size * 0.42, lineHeight: size * 0.62 }}>
        {initial(person.name)}
      </AppText>
    </View>
  );
}

export function AvatarStack({ people, max = 4, size = 26, ring }: { people: Person[]; max?: number; size?: number; ring: string }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginStart: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar person={p} size={size} ring={ring} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={{ marginStart: -size * 0.3 }}>
          <Avatar person={{ id: '+', name: `+${extra}` }} size={size} ring={ring} />
        </View>
      ) : null}
    </View>
  );
}
