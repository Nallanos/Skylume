<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
</script>

<LayoutLandingPage />

<main class="container mx-auto px-4 py-16 max-w-3xl text-gray-300">
  <h1 class="text-4xl font-bold mb-8 text-white">Responsible Messaging on Bluesky</h1>
  <p class="text-sm text-gray-400 mb-12">Last updated: Mar 28 2025</p>

  <!-- Introduction -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-4">Our Ethical Framework</h2>
    <p class="mb-4">
      In a decentralized and user-centric network like Bluesky, automation should serve to enhance
      engagement, not disrupt it. Our approach to messaging is built on respect, relevance, and user
      choice.
    </p>
  </section>

  <!-- Core Principles -->
  <section class="space-y-12">
    <!-- 1. Opt-in Respect -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-4">1. Opt-in Respect</h2>
      <p class="mb-4">
        <span class="font-bold text-teal-400">User Sovereignty:</span> Strict adherence to user preferences:
      </p>
      <ul class="list-disc pl-6 space-y-2">
        <li>Zero messages to accounts with "No DMs" in bio</li>
        <li>Automatic preference detection</li>
        <li>Instant unsubscribe option</li>
      </ul>
    </section>

    <!-- 2. Follower-Only Outreach -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-4">2. Follower-Only Outreach</h2>
      <ul class="list-disc pl-6 space-y-2">
        <li>Messages limited to existing followers</li>
        <li>Requires mutual connection</li>
        <li>No cold outreach</li>
      </ul>
      <p class="mt-4 italic text-sm text-gray-400">
        We believe engagement should be consent-based and reciprocal
      </p>
    </section>

    <!-- 3. Quality Focus -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-4">3. Quality Over Quantity</h2>
      <p>Built-in safeguards ensure meaningful interactions:</p>
      <ul class="list-disc pl-6 space-y-2 mt-2">
        <li>Strict rate limiting</li>
        <li>Personalization requirements</li>
        <li>Anti-spam algorithms</li>
      </ul>
    </section>

    <!-- 4. Transparency & Control -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold mb-4">4. Transparency & Control</h2>
      <p>Users maintain complete oversight through:</p>
      <ul class="list-disc pl-6 space-y-2 mt-2">
        <li>Clear preference dashboard</li>
        <li>Activity audit logs</li>
        <li>Real-time opt-out mechanisms</li>
      </ul>
    </section>

    <!-- Ethical Necessity -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold mb-4">Why Ethical Automation Matters</h2>
      <p class="mb-4">
        The demand for engagement tools will grow. Without responsible solutions, this space will be
        filled by low-quality services that harm user experience.
      </p>
      <div class="bg-gray-800 p-6 rounded-lg">
        <h3 class="text-lg font-semibold mb-3 text-teal-400">Our Differentiators</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>Never interacts with non-followers</li>
          <li>No artificial engagement (likes/replies)</li>
          <li>Compliance-first design</li>
        </ul>
      </div>
    </section>

    <!-- Final Commitment -->
    <section class="pt-8">
      <h2 class="text-2xl font-semibold mb-4">Our Promise to the Bluesky Community</h2>
      <p class="text-lg leading-relaxed">
        We're committed to helping creators and businesses build genuine connections while
        preserving Bluesky's spam-free environment. Our tools are designed to amplify human
        connection, not replace it.
      </p>
    </section>
  </section>
</main>
