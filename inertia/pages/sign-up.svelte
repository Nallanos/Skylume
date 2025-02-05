<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import { page } from '@inertiajs/svelte'
  import UserAuthForm from '@/components/user-auth-form.svelte'
  import { CheckCircle, Lock, Zap, Rocket } from 'lucide-svelte'
</script>

<div class="flex items-center justify-center min-h-screen b">
  <LayoutLandingPage />

  <div class="lg:p-8 w-full max-w-4xl mx-4">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <!-- Left Column - Benefits -->
      <div class="space-y-6 text-white hidden md:block">
        <div class="flex items-center gap-3 mb-8">
          <Rocket class="w-8 h-8 text-teal-400" />
          <h2 class="text-2xl font-bold">Join Alpha Testers Growing Their Bluesky Sales</h2>
        </div>

        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <Zap class="w-5 h-5 text-teal-400 mt-1 flex-shrink-0" />
            <div>
              <h3 class="font-semibold">Instant Access To:</h3>
              <ul class="space-y-2 text-gray-300 text-sm mt-1">
                <li>• Automated DM Campaigns</li>
                <li>• AI-Powered Post Generator</li>
                <li>• Real-time Analytics Dashboard</li>
              </ul>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-teal-400 mt-1 flex-shrink-0" />
            <div>
              <h3 class="font-semibold">Alpha Member Benefits:</h3>
              <ul class="space-y-2 text-gray-300 text-sm mt-1">
                <li>• Lock in your pricing plan for life.</li>
                <li>• Priority Feature Requests</li>
                <li>• Exclusive Community Access</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-8 p-4 bg-teal-900/30 rounded-lg border border-teal-500/20">
          <div class="flex items-center gap-2 text-sm text-teal-300">
            <Lock class="w-4 h-4" />
            <span>256-bit SSL Encryption • GDPR Compliant</span>
          </div>
        </div>
      </div>

      <!-- Right Column - Form -->
      <div class="mx-auto w-full max-w-sm rounded-2xl p-8 border border-gray-800 shadow-xl">
        <div class="space-y-6">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-white mb-2">Start Your Free Trial</h1>
            <p class="text-gray-400 text-sm">30-day trial • No credit card required</p>
          </div>

          <UserAuthForm apiAuth={'sign-up'} error={$page.props} />

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-700"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-gray-800 px-2 text-gray-400">Alpha Exclusive</span>
            </div>
          </div>

          <div class="text-center">
            <p class="text-gray-400 text-sm px-4">
              "Joined Alpha last week - already seeing 2x more leads!"
              <span class="block mt-1 text-teal-400">@Alexis, Indie Founder</span>
            </p>
          </div>

          <p class="text-gray-400 text-xs text-center">
            By continuing, you agree to our
            <a href="/terms" class="text-teal-400 hover:underline">Terms</a> and
            <a href="/privacy" class="text-teal-400 hover:underline">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
