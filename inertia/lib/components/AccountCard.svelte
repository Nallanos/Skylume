<script lang="ts">
  import type { Listener } from '@/type'
  import Button from './../ui/button/button.svelte'
  import { Trash2, Bot } from 'lucide-svelte'
  import { router } from '@inertiajs/svelte'
  import type Account from '#models/account'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
  } from '@/ui/dialog'

  export let account: Account
  export let listeners: Listener[]
  const id = account.id

  let showDeleteDialog = false

  async function handleDelete() {
    console.log('delete', id)
    await router.post('/dashboard/accounts/delete', { id: id })
  }
</script>

<div class="group relative">
  <a
    href={`/account/${account.id}/dashboard`}
    class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border border-gray-800 rounded-lg hover:bg-gray-800 transition-all duration-200 hover:shadow-xl gap-4"
  >
    <div class="flex items-center gap-4">
      <div class="p-3 rounded-full">
        <Bot class="h-6 w-6 text-blue-400" />
      </div>
      <div class="text-left">
        <h3 class="text-lg font-semibold text-gray-100">{account.handle}</h3>
        <p class="text-sm text-muted-foreground mt-1">
          <span class="text-blue-400 font-medium">{listeners.length}</span> bots actifs
        </p>
      </div>
    </div>
  </a>

  <Dialog bind:open={showDeleteDialog}>
    <DialogTrigger>
      <Button
        variant="ghost"
        size="sm"
        class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-red-900/20 hover:bg-red-900/30 text-red-400 hover:text-red-300"
      >
        <Trash2 class="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Are you sure ?</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete the @{account.handle} account? This action is irreversible.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" on:click={() => (showDeleteDialog = false)}>Annuler</Button>
        <Button variant="destructive" on:click={handleDelete}>Supprimer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
