<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import { theme } from '../stores/theme'
</script>

<LayoutLandingPage />

<main class="container mx-auto px-4 py-16 max-w-3xl {$theme}">
  <h1 class="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>
  <p class="text-sm text-muted-foreground mb-12">Last updated: Mar 28 2025</p>

  <!-- Introduction -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-4 text-foreground">Welcome to Bluesky bot</h2>
    <p class="mb-4 text-muted-foreground">
      These Terms of Service ("Terms") govern your access to and use of our services, including our
      website, tools, and applications (collectively, the "Service"). By accessing or using the
      Service, you agree to be bound by these Terms.
    </p>
    <p class="text-muted-foreground">
      If you are using the Service on behalf of an organization, you are agreeing to these Terms for
      that organization and promising that you have the authority to bind that organization to these
      Terms.
    </p>
  </section>

  <!-- Key Sections -->
  <section class="space-y-12">
    <!-- Acceptable Use -->
    <div class="bg-card border border-border rounded-lg p-6">
      <h3 class="text-xl font-semibold mb-4 text-foreground">Acceptable Use</h3>
      <p class="mb-4 text-muted-foreground">You agree not to:</p>
      <ul class="list-disc pl-6 space-y-2 text-muted-foreground">
        <li>Use the Service for any illegal purposes</li>
        <li>Send spam or unsolicited messages</li>
        <li>Impersonate others or provide inaccurate information</li>
        <li>Violate Bluesky's terms of service</li>
        <li>Circumvent rate limits or other restrictions</li>
      </ul>
    </div>

    <!-- Account Terms -->
    <div class="bg-card border border-border rounded-lg p-6">
      <h3 class="text-xl font-semibold mb-4 text-foreground">Account Terms</h3>
      <ul class="space-y-4 text-muted-foreground">
        <li>You are responsible for maintaining the security of your account</li>
        <li>You must provide accurate account information</li>
        <li>One person or entity may not maintain more than one free account</li>
        <li>You may not use the Service for any illegal or unauthorized purpose</li>
      </ul>
    </div>

    <!-- Payment Terms -->
    <div class="bg-card border border-border rounded-lg p-6">
      <h3 class="text-xl font-semibold mb-4 text-foreground">Payment Terms</h3>
      <ul class="space-y-4 text-muted-foreground">
        <li>Free accounts are available with limited features</li>
        <li>Paid accounts are billed monthly or annually</li>
        <li>Refunds are handled on a case-by-case basis</li>
        <li>We may change our fees upon reasonable notice</li>
      </ul>
    </div>

    <!-- Cancellation -->
    <div class="bg-card border border-border rounded-lg p-6">
      <h3 class="text-xl font-semibold mb-4 text-foreground">Cancellation and Termination</h3>
      <ul class="space-y-4 text-muted-foreground">
        <li>You can cancel your account at any time</li>
        <li>We may terminate or suspend your account for violations</li>
        <li>All provisions of the Terms survive termination</li>
      </ul>
    </div>

    <!-- Liability -->
    <div class="bg-card border border-border rounded-lg p-6">
      <h3 class="text-xl font-semibold mb-4 text-foreground">Limitation of Liability</h3>
      <p class="text-muted-foreground">
        The Service is provided "as is" without warranty of any kind. We are not liable for any
        damages resulting from your use of the Service.
      </p>
    </div>
  </section>

  <!-- Contact Info -->
  <section class="mt-12 pt-8 border-t border-border">
    <h2 class="text-2xl font-semibold mb-4 text-foreground">Questions?</h2>
    <p class="text-muted-foreground">
      If you have any questions about these Terms, please contact us:
    </p>
    <p class="mt-2">
      <a href="mailto:contact@example.com" class="text-primary hover:text-primary/80">
        contact@example.com
      </a>
    </p>
  </section>
</main>
