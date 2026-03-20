<script setup lang="ts">
import {ViewList} from '@potmot/list';
import {ref} from 'vue';

type ViewListItem = {
    id: string;
    name: string;
    age: number;
};

const viewListData = ref<ViewListItem[]>([
    {
        id: '1',
        name: 'Jack',
        age: 18,
    },
    {
        id: '2',
        name: 'Rose',
        age: 19,
    },
    {
        id: '3',
        name: 'Mary',
        age: 20,
    },
]);
</script>

<template>
    <div>
        <ViewList
            :lines="viewListData"
            :to-key="(item) => item.id"
        >
            <template #head>
                <h1>ViewList Example</h1>
            </template>
            <template #line="{item}">
                <div>
                    <div>id: {{ item.id }}</div>
                    <div>name: {{ item.name }}</div>
                    <div>age: {{ item.age }}</div>
                </div>
            </template>
        </ViewList>
    </div>
</template>
