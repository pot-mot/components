<script setup lang="ts">
import ViewListBase from './components/ViewListBase.vue';
import EditListBase from './components/EditListBase.vue';
import {ref} from 'vue';

const examples = {
    ViewListBase: {
        label: "ViewList Base",
        component: ViewListBase,
    },
    EditListBase: {
        label: "EditList Base",
        component: EditListBase,
    },
} as const;

type ExampleType = keyof typeof examples;

const example = ref<ExampleType>('ViewListBase');
</script>

<template>
    <div>
        <select v-model="example">
            <option v-for="(example, key) in examples" :key="key" :value="key">
                {{ example.label }}
            </option>
        </select>
        <component :is="examples[example].component" />
    </div>
</template>