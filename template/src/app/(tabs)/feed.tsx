import { FlashList } from '@shopify/flash-list';
import { Heart, WifiOff } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import { EmptyState } from '@/components/app/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { usePosts, type Post } from '@/features/feed/api';

// Лента с сервера: загрузка, ошибка, «потянуть для обновления», подгрузка при прокрутке.
export default function FeedScreen() {
  const { t } = useTranslation();
  const query = usePosts();
  const posts = React.useMemo(() => query.data?.pages.flatMap((p) => p.posts) ?? [], [query.data]);

  if (query.isPending) return <FeedSkeleton />;

  if (query.isError) {
    return (
      <EmptyState icon={WifiOff} title={t('feed.error')} hint={query.error.message}>
        <Button onPress={() => void query.refetch()}>
          <Text>{t('feed.retry')}</Text>
        </Button>
      </EmptyState>
    );
  }

  return (
    <FlashList
      data={posts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16 }}
      ItemSeparatorComponent={Separator}
      renderItem={({ item }) => <PostCard post={item} />}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
        />
      }
    />
  );
}

function Separator() {
  return <View className="h-3" />;
}

function PostCard({ post }: { post: Post }) {
  const { t } = useTranslation();
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="leading-6">{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="gap-3 px-4">
        <Text variant="muted" numberOfLines={3}>
          {post.body}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              <Text>{tag}</Text>
            </Badge>
          ))}
          <View className="ml-auto flex-row items-center gap-1">
            <Icon as={Heart} className="size-4 text-chart-2" />
            <Text variant="muted">{t('feed.likes', { count: post.reactions.likes })}</Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <View className="flex-1 gap-3 bg-background p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="gap-3 rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </View>
      ))}
    </View>
  );
}
