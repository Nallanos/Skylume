<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/ui/card'
  import { Label } from '@/ui/label'
  import { Button } from '@/ui/button'
  import { Textarea } from '@/ui/textarea'
  import { Send, Lock } from 'lucide-svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import * as Select from '@/ui/select'
  import { Calendar } from '@/ui/calendar'
  import { Popover, PopoverTrigger, PopoverContent } from '@/ui/popover'
  import { format } from 'date-fns'
  import type User from '#models/user'
  import type Account from '#models/account'
  import { router } from '@inertiajs/svelte'
  import type { DateValue } from '@internationalized/date'

  const user = $page.props.user as User
  let accounts = user.account as unknown as Account[]
  $: isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

  let message = ''
  let selectedDate: DateValue | undefined
  let selectedTime = ''
  let account_handle = ''
  let errorMessage = ''
  let showTimePicker = false
  let isHourMode = true
  let hours = 0
  let minutes = 0

  function updateTime(event: MouseEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = event.clientX - centerX
    const dy = centerY - event.clientY

    const angleRadians = Math.atan2(dx, dy)
    let angleDegrees = angleRadians * (180 / Math.PI)
    const normalizedAngle = (angleDegrees + 360) % 360

    if (isHourMode) {
      hours = Math.round(normalizedAngle / 15) % 24
    } else {
      minutes = Math.round(normalizedAngle / 6) % 60
    }
  }

  function handleSelect(value: string) {
    account_handle = value
  }

  function confirmTime() {
    const formattedHours = hours.toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    selectedTime = `${formattedHours}:${formattedMinutes}`
    showTimePicker = false
  }

  const createScheduling = async () => {
    errorMessage = ''

    if (!account_handle || !message || !selectedDate || !selectedTime) {
      errorMessage = 'Please fill in all required fields before submitting.'
      return
    }

    const [hours, minutes] = selectedTime.split(':')
    const scheduledDateTime = new Date(selectedDate.toString())
    scheduledDateTime.setHours(parseInt(hours))
    scheduledDateTime.setMinutes(parseInt(minutes))
    scheduledDateTime.setSeconds(0)

    const now = new Date()
    if (scheduledDateTime < now) {
      errorMessage = 'Cannot schedule messages in the past'
      return
    }

    await createSchedulingApi({
      account_handle: account_handle,
      message: message,
      schedule_time: scheduledDateTime.toISOString(),
    })
  }

  type payloadScheduling = {
    account_handle: string
    message: string
    schedule_time: string
  }

  const createSchedulingApi = async (data: payloadScheduling) => {
    console.log(data)
    await router.post('/schedule/create', data)
  }
</script>

<div class="flex min-h-screen">
  <div class="h-screen">
    <Sidebar {user} {accounts} />
  </div>

  <main class="flex-1 p-8 relative pt-20">
    {#if isFreeLimitReached}
      <div
        class="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        <div class="bg-background rounded-lg p-6 max-w-md text-center space-y-4">
          <Lock class="h-8 w-8 mx-auto text-primary" />
          <h3 class="text-lg font-semibold">Upgrade to Schedule More Posts</h3>
          <p class="text-sm text-muted-foreground">
            You've reached the maximum of 5 scheduled posts on the free plan. Upgrade to continue
            using scheduling features.
          </p>

          <Button
            on:click={async () => {
              await router.post('/create-stripe-session')
            }}>Upgrade Plan</Button
          >
        </div>
      </div>
    {/if}

    <div class="mb-8 space-y-2">
      <h1 class="text-3xl font-bold">Schedule Message</h1>
      <p class="text-gray-400">Planify your Bluesky messages to be sent at specific times</p>
    </div>

    <div class="space-y-8">
      <div class="space-y-2">
        <p class="block text-sm font-medium">Account</p>
        <Select.Root portal={null}>
          <Select.Trigger
            class="w-full px-3 py-2 border border-gray-800 rounded-lg hover:border-gray-400"
          >
            <Select.Value placeholder="Select an account" />
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Your accounts</Select.Label>
              {#each accounts as account}
                <Select.Item value={account.handle} on:click={() => handleSelect(account.handle)}>
                  {account.handle}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
          <Select.Input name="account" required />
        </Select.Root>
      </div>

      <Card class="border-gray-800">
        <CardHeader>
          <CardTitle>Message Content</CardTitle>
          <CardDescription>Write your message to schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            bind:value={message}
            class="border-gray-800 min-h-[200px]"
            placeholder="Write your message here..."
            required
          />
        </CardContent>
      </Card>

      <Card class="border-gray-800">
        <CardHeader>
          <CardTitle>Scheduling Time</CardTitle>
          <CardDescription>Select when to send the message</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Schedule Date & Time</Label>
            <div class="flex gap-2">
              <!-- Date Picker -->
              <Popover>
                <PopoverTrigger>
                  <Button variant="outline" class="border-gray-800">
                    {#if selectedDate}
                      {format(new Date(selectedDate.toString()), 'PPP')}
                    {:else}
                      Select date
                    {/if}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="border-gray-800">
                  <Calendar
                    bind:value={selectedDate}
                    class="rounded-md"
                    isDateDisabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return new Date(date.toDate('UTC')) < today
                    }}
                  />
                </PopoverContent>
              </Popover>

              <!-- Time Picker -->
              <Popover open={showTimePicker} on:close={() => (showTimePicker = false)}>
                <PopoverTrigger>
                  <Button
                    variant="outline"
                    class="border-gray-800"
                    on:click={() => (showTimePicker = true)}
                  >
                    {#if selectedTime}
                      {selectedTime}
                    {:else}
                      Select time
                    {/if}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="border-gray-800 p-6 ">
                  <div class="flex flex-col items-center gap-4">
                    <div class="flex gap-2">
                      <Button
                        variant={isHourMode ? 'default' : 'outline'}
                        on:click={() => (isHourMode = true)}
                      >
                        {hours.toString().padStart(2, '0')}
                      </Button>
                      <Button
                        variant={!isHourMode ? 'default' : 'outline'}
                        on:click={() => (isHourMode = false)}
                      >
                        {minutes.toString().padStart(2, '0')}
                      </Button>
                    </div>

                    <div
                      class="clock-face"
                      role="button"
                      tabindex="0"
                      on:mousedown|preventDefault={(e) => updateTime(e, e.currentTarget)}
                      on:mousemove|preventDefault={(e) => {
                        if (e.buttons === 1) updateTime(e, e.currentTarget)
                      }}
                    >
                      <div
                        class="selection-handle"
                        style={`transform: translateX(-50%) rotate(${isHourMode ? hours * 15 : minutes * 6}deg);`}
                      />
                      <div class="center-dot" />
                    </div>

                    <Button on:click={confirmTime} class="w-full">Confirm</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {#if errorMessage}
        <p class="text-red-500 text-sm">{errorMessage}</p>
      {/if}

      <div class="flex justify-end gap-4 pb-16">
        <Button variant="outline" class="border-gray-800">Cancel</Button>
        <Button on:click={createScheduling} class="gap-2">
          <Send class="h-4 w-4" />
          Schedule Message
        </Button>
      </div>
    </div>
  </main>
</div>

<style>
  .clock-face {
    width: 280px;
    height: 280px;
    border-radius: 50%;
    background: #1a1a1a;
  }

  .selection-handle {
    position: absolute;
    width: 4px;
    height: 30%;
    background: #3b82f6;
    left: 50%;
    bottom: 50%;
    transform-origin: bottom center;
    transform: translateX(-50%) rotate(0deg);
  }

  .center-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
