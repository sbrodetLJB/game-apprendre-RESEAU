import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import type { SvgIconComponent } from '@mui/icons-material';
import apiClient from '../api/client';

interface BadgeRow {
  id: number;
  key: string;
  label: string;
  description: string;
  iconKey: string;
  earnedAt: string | null;
}

const iconByKey: Record<string, SvgIconComponent> = {
  flag: FlagIcon,
  star: StarIcon,
  trophy: EmojiEventsIcon,
  book: AutoStoriesIcon,
};

export default function Badges() {
  const [badges, setBadges] = useState<BadgeRow[]>([]);

  useEffect(() => {
    apiClient.get<BadgeRow[]>('/me/badges').then(({ data }) => setBadges(data));
  }, []);

  const earnedCount = badges.filter((b) => b.earnedAt).length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Badges
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {earnedCount}/{badges.length} débloqués.
      </Typography>

      <Grid container spacing={2}>
        {badges.map((badge) => {
          const Icon = iconByKey[badge.iconKey] ?? StarIcon;
          const earned = !!badge.earnedAt;
          return (
            <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ opacity: earned ? 1 : 0.5, height: '100%' }}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Icon color={earned ? 'warning' : 'disabled'} sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {badge.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {badge.description}
                    </Typography>
                    {earned && (
                      <Typography variant="caption" color="success.main">
                        Débloqué le {new Date(badge.earnedAt!).toLocaleDateString('fr-FR')}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
