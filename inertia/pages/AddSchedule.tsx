import { useState } from 'react'
import { Head, usePage, useForm } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Calendar, Clock, Plus } from 'lucide-react'

interface Account {
  id: number
  handle: string
  displayName: string
}

interface User {
  id: number
  email: string
  account?: Account[]
}

function AddSchedule() {
  const { props } = usePage()
  const user = props.user as User
  const accounts = user.account || []

  const { data, setData, post, processing } = useForm({
    account_id: '',
    message: '',
    schedule_time: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/schedule/create')
  }

  // Get current date and time for min datetime input
  const now = new Date()
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <>
      <Head title="Schedule New Post" />
      <Layout user={user}>
        <div className="max-w-2xl flex flex-col gap-12 mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle className="text-2xl">Schedule New Post</CardTitle>
                  <p className="text-muted-foreground">
                    Create and schedule your next Bluesky post
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Account Selection */}
                <div>
                  <Label htmlFor="account">Select Account</Label>
                  <select
                    id="account"
                    className="w-full p-3 border border-gray-800 rounded-md bg-background"
                    value={data.account_id}
                    onChange={(e) => setData('account_id', e.target.value)}
                    required
                  >
                    <option value="">Choose an account to post from</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id.toString()}>
                        @{account.handle} - {account.displayName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which Bluesky account will publish this post
                  </p>
                </div>

                {/* Message Content */}
                <div>
                  <Label htmlFor="message">Post Content</Label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full p-3 border border-gray-800 rounded-md resize-none bg-background"
                    placeholder="What's happening? Share your thoughts..."
                    value={data.message}
                    onChange={(e) => setData('message', e.target.value)}
                    maxLength={300}
                    required
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">
                      Write your post content (supports hashtags and mentions)
                    </p>
                    <span
                      className={`text-xs ${data.message.length > 280 ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      {data.message.length}/300
                    </span>
                  </div>
                </div>

                {/* Schedule Time */}
                <div>
                  <Label htmlFor="schedule_time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Schedule Time
                  </Label>
                  <Input
                    id="schedule_time"
                    type="datetime-local"
                    className="border-gray-800"
                    value={data.schedule_time}
                    min={minDateTime}
                    onChange={(e) => setData('schedule_time', e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose when you want this post to be published
                  </p>
                </div>

                {/* Preview */}
                {data.message && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Preview
                    </h3>
                    <div className="bg-background border rounded-md p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {accounts.find((a) => a.id.toString() === data.account_id)
                            ?.displayName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {accounts.find((a) => a.id.toString() === data.account_id)
                              ?.displayName || 'Select account'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @
                            {accounts.find((a) => a.id.toString() === data.account_id)?.handle ||
                              'account'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{data.message}</p>
                      {data.schedule_time && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Scheduled for: {new Date(data.schedule_time).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={
                      processing || !data.account_id || !data.message || !data.schedule_time
                    }
                    className="flex-1"
                  >
                    {processing ? 'Scheduling...' : 'Schedule Post'}
                  </Button>

                  <Button type="button" variant="outline" asChild>
                    <a href="/schedule">Cancel</a>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">💡 Scheduling Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Posts can be scheduled up to 1 year in advance</li>
                <li>• Use hashtags (#) and mentions (@) for better engagement</li>
                <li>• Optimal posting times vary by audience - experiment to find yours</li>
                <li>• Keep posts under 280 characters for better readability</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default AddSchedule
