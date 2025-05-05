<script lang="ts">
  export let title: string;
  export let description: string;
  export let type: string = 'general';
  
  // Déterminer les couleurs en fonction du type de suggestion
  let typeColors = {
    icon: '',
    bg: '',
    border: ''
  };
  
  // Définir les couleurs et icônes en fonction du type
  switch (type) {
    case 'topic':
      typeColors = {
        icon: '📊',
        bg: 'bg-blue-50',
        border: 'border-blue-200'
      };
      break;
    case 'engagement':
      typeColors = {
        icon: '🔄',
        bg: 'bg-green-50',
        border: 'border-green-200'
      };
      break;
    case 'growth':
      typeColors = {
        icon: '📈',
        bg: 'bg-purple-50',
        border: 'border-purple-200'
      };
      break;
    default:
      typeColors = {
        icon: '💡',
        bg: 'bg-gray-50',
        border: 'border-gray-200'
      };
  }
</script>

<div class={`p-4 rounded-lg border mb-4 ${typeColors.bg} ${typeColors.border}`}>
  <div class="flex items-start">
    <div class="text-2xl mr-3">{typeColors.icon}</div>
    <div>
      <h3 class="text-lg font-semibold mb-1">{title}</h3>
      <p class="text-sm text-gray-700">{description}</p>
      
      <div class="mt-3 flex justify-between items-center">
        <span class="text-xs px-2 py-1 bg-white rounded-full border border-gray-200">
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
        
        <button class="text-sm text-blue-600 hover:underline">
          Appliquer
        </button>
      </div>
    </div>
  </div>
</div>