<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shadcn-ui/card'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shadcn-ui/table'

  // Definition of a post type interface
  interface Post {
    text: string
    likes: number
    reposts: number
    replies: number
    date: string
    url: string
    engagement_rate: number
  }

  // Props to receive posts with explicit type
  export let posts: Post[] = []

  // Helper function to format dates
  function formatFullDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
  }
</script>

<Card class="border-gray-100">
  <CardHeader>
    <CardTitle>Best Performing Posts</CardTitle>
    <CardDescription>Posts with the highest engagement rates</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="overflow-x-auto">
      <Table class="border-collapse">
        <TableHeader>
          <TableRow class="border-b border-gray-100 dark:border-gray-800">
            <TableHead>Post</TableHead>
            <TableHead class="text-right">Likes</TableHead>
            <TableHead class="text-right">Reposts</TableHead>
            <TableHead class="text-right">Replies</TableHead>
            <TableHead class="text-right">Engagement Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#if posts.length === 0}
            <TableRow>
              <TableCell class="text-center py-6 text-muted-foreground">No posts found</TableCell>
            </TableRow>
          {:else}
            {#each posts as post}
              <TableRow class="border-b border-gray-50 dark:border-gray-800">
                <TableCell class="max-w-[400px]">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-primary transition-colors line-clamp-1"
                  >
                    {post.text}
                  </a>
                  <div class="text-xs text-muted-foreground mt-1">
                    {formatFullDate(post.date)}
                  </div>
                </TableCell>
                <TableCell class="text-right">{post.likes.toLocaleString()}</TableCell>
                <TableCell class="text-right">{post.reposts.toLocaleString()}</TableCell>
                <TableCell class="text-right">{post.replies.toLocaleString()}</TableCell>
                <TableCell class="text-right font-medium">
                  {post.engagement_rate.toFixed(1)}%
                </TableCell>
              </TableRow>
            {/each}
          {/if}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>
