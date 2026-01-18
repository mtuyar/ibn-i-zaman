export interface Question {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    category: 'knowledge' | 'ethics' | 'situation';
}

export const QUESTIONS: Question[] = [
    {
        id: '1',
        text: 'Hangi davranış kul hakkına girer?',
        options: ['Gıybet etmek', 'Namaz kılmak', 'Oruç tutmak'],
        correctIndex: 0,
        category: 'ethics'
    },
    {
        id: '2',
        text: 'Sabır nedir?',
        options: ['Beklemek', 'Zorluklara göğüs germek', 'Hiçbir şey yapmamak'],
        correctIndex: 1,
        category: 'knowledge'
    },
    {
        id: '3',
        text: 'Yolda bir engel gördün, ne yaparsın?',
        options: ['Görmezden gelirim', 'Kenara çekerim', 'Üstünden geçerim'],
        correctIndex: 1,
        category: 'situation'
    },
    {
        id: '4',
        text: 'Birisi sana kötü söz söyledi, tepkin ne olur?',
        options: ['Aynısını söylerim', 'Sabrederim', 'Kavga ederim'],
        correctIndex: 1,
        category: 'situation'
    },
    {
        id: '5',
        text: 'İsraf nedir?',
        options: ['Gereksiz harcama', 'Para biriktirme', 'Sadaka verme'],
        correctIndex: 0,
        category: 'knowledge'
    }
];
