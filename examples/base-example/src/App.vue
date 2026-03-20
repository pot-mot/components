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
        name: '张三',
        age: 18,
    },
    {
        id: '2',
        name: '李四',
        age: 19,
    },
    {
        id: '3',
        name: '王五',
        age: 20,
    },
]);
</script>

<template>
    <div>
        <h1>ViewList 示例</h1>
        <ViewList
            :lines="viewListData"
            :to-key="(item) => item.id"
        >
            <template
                #line="{item}"
            >
                <div>
                    <div>{{item.id}}</div>
                    <div>{{item.name}}</div>
                    <div>{{item.age}}</div>
                </div>
            </template>
        </ViewList>
    </div>
</template>
