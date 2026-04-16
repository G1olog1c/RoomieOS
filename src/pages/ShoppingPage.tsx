import React, { useEffect, useState } from 'react';
import { useShoppingStore } from '../store/shoppingStore';
import { useNotificationStore } from '../store/notificationStore';
import { ArrowLeft, Plus, Check, ShoppingCart, Trash2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ShoppingPage: React.FC = () => {
    const { items, isLoading, fetchItems, addItem, toggleItemStatus, deleteItem } = useShoppingStore();
    const [newItemTitle, setNewItemTitle] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const { markAsSeen } = useNotificationStore();

    useEffect(() => {
        fetchItems();
        markAsSeen('shopping');
    }, [fetchItems, markAsSeen]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!newItemTitle.trim()) {
            setValidationError('Nazwa produktu nie może być pusta.');
            return;
        }
        
        const success = await addItem(newItemTitle.trim());
        if (success) {
            setNewItemTitle('');
            setValidationError(null);
        } else {
            setValidationError('Wystąpił błąd podczas dodawania produktu.');
        }
    };

    const activeItems = items.filter(i => !i.is_completed);
    const completedItems = items.filter(i => i.is_completed);

    return (
        <div className="main-content animate-fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/">
                    <button className="btn-secondary" style={{ padding: '0.6rem' }}>
                        <ArrowLeft size={18} />
                    </button>
                </Link>
                <h2>Lista Zakupów</h2>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                {validationError && (
                    <div className="error-message" style={{ marginBottom: '1.25rem', marginTop: 0 }}>
                        <AlertCircle size={16} />
                        <span>{validationError}</span>
                    </div>
                )}
                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem' }}>
                    <input 
                        type="text" 
                        className="input-field" 
                        placeholder="np. Mleko 2%, Płyn do naczyń..." 
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: 'auto', padding: '0 1.5rem' }}>
                        <Plus size={20} />
                    </button>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={20} color="var(--primary-color)" /> Co trzeba kupić ({activeItems.length})
                </h3>
                
                {activeItems.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Brak produktów na liście. Wszystko kupione!</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {activeItems.map(item => (
                            <li key={item.id} className="animate-fade-in hover-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '0.75rem', border: '1px solid var(--surface-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <button 
                                        onClick={() => toggleItemStatus(item.id, item.is_completed)}
                                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--primary-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                    </button>
                                    <span style={{ fontSize: '1.1rem' }}>{item.title}</span>
                                </div>
                                <button onClick={() => deleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
                                    <Trash2 size={18} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {completedItems.length > 0 && (
                    <div style={{ marginTop: '3rem' }}>
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ostatnio kupione ({completedItems.length})</h4>
                        <ul style={{ listStyle: 'none', padding: 0, opacity: 0.6 }}>
                            {completedItems.map(item => (
                                <li key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', margin: '0.5rem 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <button 
                                            onClick={() => toggleItemStatus(item.id, item.is_completed)}
                                            style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'var(--success-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Check size={14} color="white" />
                                        </button>
                                        <span style={{ textDecoration: 'line-through' }}>{item.title}</span>
                                    </div>
                                    <button onClick={() => deleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
