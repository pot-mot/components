<script setup lang="ts">
import {EditList} from '@potmot/list';
import {ref} from 'vue';

type EditListItem = {
    id: string;
    name: string;
    age: number;
};

const editListData = ref<EditListItem[]>([
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

const nextId = ref(4);
const defaultEditListData = (): EditListItem => ({
    id: `${nextId.value}`,
    name: `New Member - ${nextId.value++}`,
    age: 18,
});
</script>

<template>
    <div>
        <EditList
            :lines="editListData"
            :to-key="(item) => item.id"
            :default-line="defaultEditListData"
        >
            <template #head>
                <h1>EditList Example</h1>
            </template>
            <template #line="{item}">
                <div>
                    <div>id: {{ item.id }}</div>
                    <div>name: {{ item.name }}</div>
                    <div>age: {{ item.age }}</div>
                </div>
            </template>
        </EditList>
    </div>
</template>
